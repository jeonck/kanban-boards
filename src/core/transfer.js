// 내보내기(JSON·CSV)와 가져오기(JSON). 파일 저장은 아티팩트 downloads 기능이 확인 창을 띄운다.
import { $, csvCell, esc } from "./util.js";
import { ymd } from "./dates.js";
import { toast } from "./toast.js";

// csv: { header: string[], row(card): any[] }
// parse(arr, { cards }): 가져온 항목 배열을 카드 배열로 정리한다.
export function attachTransfer({ store, columns, appId, filePrefix, csv, parse }) {
  let dl = null;
  let pendingImport = null;

  (async () => {
    try {
      dl = await (window.claude && window.claude.use ? window.claude.use("downloads") : null);
    } catch (e) {
      dl = null;
    }
    if (!dl) {
      $("#ex-json").hidden = true;
      $("#ex-csv").hidden = true;
    }
  })();

  const sorted = () => {
    const idx = (id) => columns.findIndex((x) => x.id === id);
    return store.cards.slice().sort((a, b) => idx(a.col) - idx(b.col) || a.order - b.order);
  };

  async function doExport(kind) {
    if (!dl) return;
    if (store.mode === "preview") {
      toast("불러오는 중이에요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const list = sorted();
    const stamp = ymd(new Date());
    let name;
    let data;
    if (kind === "json") {
      const cards = list.map((c) => {
        const o = { ...c };
        delete o.sample;
        return o;
      });
      data = JSON.stringify({ app: appId, version: 1, exportedAt: new Date().toISOString(), cards }, null, 2);
      name = filePrefix + "-" + stamp + ".json";
    } else {
      const rows = [csv.header, ...list.map(csv.row)];
      data = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"); // BOM: 엑셀에서 한글 깨짐 방지
      name = filePrefix + "-" + stamp + ".csv";
    }
    try {
      await dl.save({ filename: name, data });
      toast("파일을 저장했어요.");
    } catch (e) {
      if (e && e.code === "declined") return;
      toast("파일을 저장하지 못했어요.");
    }
  }

  function showImportPanel() {
    $("#im-panel").innerHTML =
      '<div class="im-box"><p>파일에서 카드 <b>' + pendingImport.length + '장</b>을 찾았어요.</p><div class="db-btns">' +
      '<button type="button" class="btn primary" data-im="merge">기존 카드에 합치기</button>' +
      '<button type="button" class="btn" data-im="replace">전체 교체 (기존 ' + esc(store.cards.length) + "장 삭제)</button>" +
      '<button type="button" class="btn" data-im="cancel">취소</button></div>' +
      '<p class="hint">합치기는 같은 ID의 카드를 덮어쓰고 나머지는 새로 추가해요.</p></div>';
  }

  $("#ex-json").addEventListener("click", () => doExport("json"));
  $("#ex-csv").addEventListener("click", () => doExport("csv"));
  $("#im-btn").addEventListener("click", () => $("#im-file").click());

  $("#im-file").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 3 * 1024 * 1024) throw new Error("size");
      const data = JSON.parse(await f.text());
      const arr = Array.isArray(data) ? data : data && data.cards;
      if (!Array.isArray(arr)) throw new Error("shape");
      pendingImport = parse(arr, { cards: store.cards });
      if (!pendingImport.length) {
        toast("가져올 카드를 찾지 못했어요.");
        return;
      }
      showImportPanel();
    } catch (err) {
      toast("파일을 읽지 못했어요. 이 보드에서 내보낸 JSON 파일인지 확인해 주세요.");
    }
  });

  $("#im-panel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-im]");
    if (!b) return;
    const act = b.dataset.im;
    const ups = pendingImport || [];
    pendingImport = null;
    $("#im-panel").innerHTML = "";
    if (act === "cancel" || !ups.length) return;
    if (act === "replace") {
      const keep = new Set(ups.map((c) => c.id));
      store.bulkApply(ups, store.cards.filter((c) => !keep.has(c.id)).map((c) => c.id));
    } else {
      store.bulkApply(ups, []);
    }
  });
}
