// 개발 보드 설정. core/app.js가 요구하는 항목을 이 보드의 모듈로 채운다.
import { toast } from "../../core/toast.js";
import { diffDays } from "../../core/dates.js";
import { sum } from "../../core/util.js";
import { cardHtml } from "./card.js";
import { sampleCards } from "./data.js";
import { editorHooks } from "./editor.js";
import { createFilters } from "./filters.js";
import { insights } from "./insights.js";
import { COLS, PRESET, PRI, colDef, diff, labelHue, norm, prepare } from "./model.js";
import { csv, parseImport } from "./transfer.js";

function renderSub(cards) {
  const open = cards.filter((c) => c.col !== "done");
  let late = 0;
  let blocked = 0;
  open.forEach((c) => {
    if (c.due && diffDays(c.due) < 0) late++;
    if (c.blocked) blocked++;
  });
  let h =
    `<span>카드 <b>${cards.length}</b></span><span>진행 중 <b>${cards.filter((c) => c.col === "doing").length}</b></span>` +
    `<span>남은 포인트 <b>${sum(open, (c) => c.pts)}</b></span>`;
  if (blocked) h += `<span class="blk">막힘 ${blocked}</span>`;
  if (late) h += `<span class="late">지연 ${late}</span>`;
  return h;
}

// 열 머리: 카드 수(WIP 한도 표시), 포인트 합계, WIP 초과 경고
function colHeader(col, all, vis) {
  const over = !!col.wip && all.length > col.wip;
  const count = vis.length !== all.length ? vis.length + "/" + all.length : col.wip ? all.length + "/" + col.wip : String(all.length);
  return {
    count,
    over,
    title: col.wip ? "WIP 한도 " + col.wip : "",
    extra: `<span class="col-pts">${sum(all, (c) => c.pts)}pt</span>` + (over ? '<span class="wip-flag">WIP 초과</span>' : ""),
  };
}

// 한도를 넘기는 열로 카드를 옮기면 알려 준다.
function saved(old, nw, cards) {
  const cd = colDef(nw.col);
  if (cd.wip && (!old || old.col !== nw.col)) {
    const n = cards.filter((c) => c.col === nw.col).length;
    if (n > cd.wip) toast(cd.name + " 열이 WIP 한도(" + cd.wip + ")를 넘었어요.");
  }
}

export default {
  lsKey: "dev-board-v1",
  appId: "dev-board",
  filePrefix: "dev-board",
  columns: COLS,
  norm,
  sample: sampleCards,
  diff,
  prepare,
  saved,
  labelHue,
  presetLabels: PRESET,
  priText: (v) => PRI[v],
  historyTracked: "단계 이동, 우선순위·마감일·담당자",
  createFilters,
  renderSub,
  colHeader,
  cardHtml,
  insights,
  editor: editorHooks,
  csv,
  parseImport,
};
