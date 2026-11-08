// 보드 조립. 보드별 설정(cfg)을 받아 저장소, 드래그, 편집창, 내보내기를 연결하고 화면을 그린다.
//
// cfg 필수 항목
//   lsKey, appId, filePrefix            저장 키와 파일 이름
//   columns [{id, name, wip?}]          열 정의
//   norm(card), sample(), diff(old,nw)  카드 정규화, 예시 카드, 이력 비교
//   labelHue(label), presetLabels       라벨 색과 기본 라벨
//   priText(v)                          우선순위 표시 문구
//   historyTracked                      이력 안내 문구
//   createFilters({onChange})           → { visible(card), sync?(cards) }
//   renderSub(cards)                    헤더 요약 HTML
//   cardHtml(card, ctx)                 카드 HTML
//   editor                              편집창 hooks (core/editor.js 참고)
//   csv, parseImport                    내보내기·가져오기 규칙
// cfg 선택 항목
//   prepare(old,nw), saved(old,nw,cards)  저장 전후 훅
//   beforeRender(cards) → ctx             렌더링마다 한 번 계산하는 값
//   colHeader(col, all, vis) → {count, over, title, extra}
//   insights { init?(getCards), render(cards) }
import { $, esc } from "./util.js";
import { toast } from "./toast.js";
import { createStore } from "./store.js";
import { attachDrag } from "./drag.js";
import { attachStages } from "./stages.js";
import { attachEditor } from "./editor.js";
import { attachTransfer } from "./transfer.js";

export function createApp(cfg) {
  const boardEl = $("#board");
  let clearArmed = false;
  let clearTimer = null;

  const store = createStore({
    lsKey: cfg.lsKey,
    norm: cfg.norm,
    sample: cfg.sample,
    diff: cfg.diff,
    prepare: cfg.prepare,
    saved: cfg.saved,
    onChange: () => render(),
  });
  const filters = cfg.createFilters({ onChange: () => renderBoard() });
  const drag = attachDrag({
    board: boardEl,
    getCard: (id) => store.find(id),
    onDrop: (card, col, order) => store.save({ ...card, col, order }),
    onEnd: () => render(),
  });
  const stages = attachStages({
    board: boardEl,
    stages: $("#stages"),
    columns: cfg.columns,
    count: (col) => store.cards.filter((c) => c.col === col.id && filters.visible(c)).length,
  });
  const editor = attachEditor({
    store,
    columns: cfg.columns,
    labelHue: cfg.labelHue,
    presetLabels: cfg.presetLabels,
    priText: cfg.priText,
    tracked: cfg.historyTracked,
    hooks: cfg.editor,
  });
  attachTransfer({ store, columns: cfg.columns, appId: cfg.appId, filePrefix: cfg.filePrefix, csv: cfg.csv, parse: cfg.parseImport });
  if (cfg.insights && cfg.insights.init) cfg.insights.init(() => store.cards);

  /* 렌더링 */
  function render() {
    // 드래그 중에는 DOM을 바꾸지 않는다. 놓을 때 onEnd나 저장이 다시 그린다.
    if (drag.active) return;
    if (filters.sync) filters.sync(store.cards);
    renderSub();
    renderBanner();
    renderBoard();
    if (cfg.insights) cfg.insights.render(store.cards);
  }

  function renderSub() {
    let h = cfg.renderSub(store.cards);
    if (store.mode === "local") h += '<span class="note">이 기기에만 저장 중</span>';
    if (store.mode === "preview") h += '<span class="note">불러오는 중…</span>';
    $("#sub").innerHTML = h;
  }

  function renderBanner() {
    const b = $("#banner");
    const ns = store.cards.filter((c) => c.sample).length;
    if (store.mode === "preview") {
      b.innerHTML = "";
    } else if (store.cards.length === 0) {
      b.innerHTML = '<div class="banner"><span>아직 카드가 없어요. 새 카드를 추가하거나 예시 카드로 시작해 보세요.</span><button type="button" class="btn" id="seed">예시 카드로 시작</button></div>';
    } else if (ns > 0) {
      b.innerHTML =
        '<div class="banner"><span>예시 카드 ' + ns + '장이 들어 있어요. 실제 프로젝트를 시작할 때 지우세요.</span><button type="button" class="btn' +
        (clearArmed ? " danger armed" : "") + '" id="clear-sample">' + (clearArmed ? "정말 " + ns + "장 삭제" : "예시 카드 모두 지우기") + "</button></div>";
    } else {
      b.innerHTML = "";
    }
  }

  function renderBoard() {
    const ctx = cfg.beforeRender ? cfg.beforeRender(store.cards) : null;
    boardEl.innerHTML = cfg.columns
      .map((col) => {
        const all = store.cards.filter((c) => c.col === col.id).sort((a, b) => a.order - b.order);
        const vis = all.filter(filters.visible);
        const h = (cfg.colHeader ? cfg.colHeader(col, all, vis) : null) || {};
        const count = h.count || (vis.length !== all.length ? vis.length + "/" + all.length : String(all.length));
        return (
          `<section class="col" data-col="${col.id}" aria-label="${col.name}"><header class="col-h"><h2>${col.name}</h2>` +
          `<span class="count${h.over ? " over" : ""}"${h.title ? ` title="${esc(h.title)}"` : ""}>${count}</span>${h.extra || ""}` +
          `<button type="button" class="col-add" data-add="${col.id}" aria-label="${col.name}에 카드 추가">+</button></header><div class="col-b">` +
          vis.map((c) => cfg.cardHtml(c, ctx)).join("") +
          (vis.length ? "" : '<p class="empty">카드를 여기로 끌어다 놓으세요</p>') +
          "</div></section>"
        );
      })
      .join("");
    stages.render();
    stages.sync();
  }

  /* 이벤트 */
  boardEl.addEventListener("click", (e) => {
    if (drag.suppressClick || e.target.closest("a")) return;
    const a = e.target.closest("[data-add]");
    if (a) return editor.open(null, a.dataset.add);
    const c = e.target.closest(".card");
    if (c) editor.open(c.dataset.id);
  });
  boardEl.addEventListener("keydown", (e) => {
    const c = e.target.closest(".card");
    if (c && e.target === c && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      editor.open(c.dataset.id);
    }
  });
  // 성과 패널 등에서 data-edit 버튼을 누르면 해당 카드를 연다.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-edit]");
    if (b) editor.open(b.dataset.edit);
  });
  $("#add").addEventListener("click", () => editor.open(null, cfg.columns[0].id));
  $("#banner").addEventListener("click", async (e) => {
    if (e.target.closest("#seed")) {
      await store.seed();
      return;
    }
    if (e.target.closest("#clear-sample")) {
      if (!clearArmed) {
        clearArmed = true;
        renderBanner();
        clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          clearArmed = false;
          renderBanner();
        }, 3000);
        return;
      }
      clearArmed = false;
      clearTimeout(clearTimer);
      const ok = await store.removeMany(store.cards.filter((c) => c.sample).map((c) => c.id));
      if (ok) toast("예시 카드를 지웠어요.");
    }
  });

  render();
  store.init();
}
