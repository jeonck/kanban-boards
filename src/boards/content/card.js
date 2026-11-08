// 콘텐츠 보드: 카드 HTML (우선순위 배지, 마감일, 라벨, 노출·클릭 미니 막대)
import { diffDays } from "../../core/dates.js";
import { esc } from "../../core/util.js";
import { PRI, labelHue } from "./model.js";

const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

export const ctrOf = (c) => (c.imp > 0 ? ((c.clk / c.imp) * 100).toFixed(1) + "%" : "–");

export function dueInfo(c) {
  if (!c.due) return null;
  const m = c.due.slice(5).replace("-", "/");
  if (c.col === "publish") return { cls: "done", text: "발행 " + m };
  const d = diffDays(c.due);
  if (d < 0) return { cls: "late", text: "D+" + -d + " 지연 · " + m };
  if (d === 0) return { cls: "today", text: "오늘 · " + m };
  return { cls: d <= 3 ? "soon" : "", text: "D-" + d + " · " + m };
}

// 렌더링마다 한 번: 미니 막대의 기준이 되는 최대 노출 수
export const beforeRender = (cards) => ({ maxImp: Math.max(1, ...cards.map((c) => c.imp)) });

export function cardHtml(c, ctx) {
  const d = dueInfo(c);
  let metrics = "";
  if (c.imp > 0) {
    metrics =
      '<div class="m"><div class="m-bars" aria-hidden="true"><b style="width:' + ((c.imp / ctx.maxImp) * 100).toFixed(1) + '%"></b>' +
      '<u style="width:' + Math.max(0.5, (c.clk / ctx.maxImp) * 100).toFixed(1) + '%"></u></div>' +
      '<p class="m-n"><span>노출 <em>' + compact.format(c.imp) + "</em></span><span>클릭 <em>" + compact.format(c.clk) +
      "</em></span><span>CTR <em>" + ctrOf(c) + "</em></span></p></div>";
  }
  const labels = c.labels.length
    ? '<div class="labels">' + c.labels.map((l) => `<span class="lb" style="--h:${labelHue(l)}">${esc(l)}</span>`).join("") + "</div>"
    : "";
  return (
    `<article class="card" data-id="${esc(c.id)}" tabindex="0" aria-label="${esc(c.title)}, 우선순위 ${PRI[c.pri]}">` +
    `<div class="c-top"><span class="pri ${c.pri}"><i class="lv"><b></b><b></b><b></b></i>${PRI[c.pri]}</span>` +
    (d ? `<span class="due ${d.cls}">${d.text}</span>` : "") +
    `</div><h3 class="title">${esc(c.title)}</h3>${labels}${metrics}</article>`
  );
}
