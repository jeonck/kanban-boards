// 콘텐츠 보드 설정. core/app.js가 요구하는 항목을 이 보드의 모듈로 채운다.
import { diffDays } from "../../core/dates.js";
import { beforeRender, cardHtml } from "./card.js";
import { sampleCards } from "./data.js";
import { editorHooks } from "./editor.js";
import { createFilters } from "./filters.js";
import { insights } from "./insights.js";
import { COLS, PRESET, PRI, diff, labelHue, norm } from "./model.js";
import { csv, parseImport } from "./transfer.js";

function renderSub(cards) {
  let late = 0;
  let week = 0;
  cards
    .filter((c) => c.col !== "publish" && c.due)
    .forEach((c) => {
      const d = diffDays(c.due);
      if (d < 0) late++;
      else if (d <= 7) week++;
    });
  let h = `<span>카드 ${cards.length}장</span><span>진행 중 ${cards.filter((c) => c.col !== "publish").length}장</span>`;
  if (late) h += `<span class="late">지연 ${late}건</span>`;
  return h + `<span>7일 내 마감 ${week}건</span>`;
}

export default {
  lsKey: "content-board-v1",
  appId: "content-board",
  filePrefix: "content-board",
  columns: COLS,
  norm,
  sample: sampleCards,
  diff,
  labelHue,
  presetLabels: PRESET,
  priText: (v) => PRI[v],
  historyTracked: "단계 이동, 우선순위·마감일",
  createFilters,
  renderSub,
  beforeRender,
  cardHtml,
  insights,
  editor: editorHooks,
  csv,
  parseImport,
};
