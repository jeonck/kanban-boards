// 콘텐츠 보드 성과 패널: 총 노출·클릭·평균 CTR과 카드별 노출/클릭 막대
import { $, esc, niceMax, sum } from "../../core/util.js";
import { COLS } from "./model.js";
import { ctrOf } from "./card.js";
import { colName } from "../../core/model.js";

const nf = new Intl.NumberFormat("ko-KR");
const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

export const insights = {
  render(cards) {
    const list = cards.filter((c) => c.imp > 0).sort((a, b) => b.imp - a.imp);
    const head =
      '<div class="perf-h"><h2>성과</h2><div class="legend"><span><i style="background:var(--bar-imp)"></i>노출</span>' +
      '<span><i style="background:var(--accent)"></i>클릭</span></div></div>';
    if (!list.length) {
      $("#perf").innerHTML = head + '<p class="perf-empty">카드에 노출·클릭 수를 입력하면 여기에 표시돼요.</p>';
      return;
    }
    const ti = sum(list, (c) => c.imp);
    const tc = sum(list, (c) => c.clk);
    const max = niceMax(list[0].imp);
    const summary =
      '<div class="p-sum"><div><span>총 노출</span><strong>' + nf.format(ti) + "</strong></div>" +
      '<div><span>총 클릭</span><strong>' + nf.format(tc) + "</strong></div>" +
      '<div><span>평균 CTR</span><strong>' + ((tc / ti) * 100).toFixed(1) + "%</strong></div>" +
      '<div><span>집계된 카드</span><strong>' + list.length + "</strong></div></div>";
    const axis =
      '<div class="axis"><span></span><div class="axis-t"><span>0</span><span>' + compact.format(max / 2) + "</span><span>" +
      compact.format(max) + "</span></div><span></span></div>";
    const rows = list
      .map(
        (c) =>
          '<div class="row"><div class="r-t"><button type="button" class="r-title" data-edit="' + esc(c.id) + '">' + esc(c.title) +
          '</button><span class="r-col">' + colName(COLS, c.col) + "</span></div>" +
          '<div class="bars" aria-hidden="true"><div class="bar-i" style="width:' + ((c.imp / max) * 100).toFixed(2) + '%"></div>' +
          '<div class="bar-c" style="width:' + ((c.clk / max) * 100).toFixed(2) + '%"></div></div>' +
          '<div class="r-n"><b>CTR ' + ctrOf(c) + "</b><span>노출 " + nf.format(c.imp) + "</span><span>클릭 " + nf.format(c.clk) + "</span></div></div>"
      )
      .join("");
    $("#perf").innerHTML = head + summary + "<div>" + axis + '<div class="rows">' + rows + "</div></div>";
  },
};
