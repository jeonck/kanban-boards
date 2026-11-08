// 개발 보드 흐름 지표: 남은 포인트, WIP, 사이클 타임, 처리량, 14일 추이
import { $, DAY, niceMax, sum } from "../../core/util.js";
import { md, today0 } from "../../core/dates.js";
import { COLS, colDef } from "./model.js";

const fmtN = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
let getCards = () => [];
let resizeTimer = 0;

function render(cards) {
  const now = Date.now();
  const open = cards.filter((c) => c.col !== "done");
  const done = cards.filter((c) => c.col === "done");
  const remain = sum(open, (c) => c.pts);
  const doingN = cards.filter((c) => c.col === "doing").length;
  const wip = colDef("doing").wip;
  const cyc = done.filter((c) => c.startedAt && c.doneAt && c.doneAt >= c.startedAt).map((c) => (c.doneAt - c.startedAt) / DAY);
  const avgCyc = cyc.length ? sum(cyc, (x) => x) / cyc.length : null;
  const last7 = sum(done.filter((c) => c.doneAt && now - c.doneAt < 7 * DAY), (c) => c.pts);

  const summary =
    '<div class="p-sum">' +
    `<div><span>남은 포인트</span><strong>${remain}<small>pt</small></strong></div>` +
    `<div><span>진행 중 / WIP 한도</span><strong class="${doingN > wip ? "bad" : ""}">${doingN}<small>/ ${wip}</small></strong></div>` +
    `<div><span>평균 사이클 타임</span><strong>${avgCyc == null ? "–" : fmtN(Math.round(avgCyc * 10) / 10) + "<small>일</small>"}</strong></div>` +
    `<div><span>최근 7일 완료</span><strong>${last7}<small>pt</small></strong></div></div>`;

  const total = sum(cards, (c) => c.pts);
  const ptsOf = (col) => sum(cards.filter((c) => c.col === col.id), (c) => c.pts);
  const dist =
    "<div><h3>열별 포인트 분포</h3>" +
    (total
      ? '<div class="dist" role="img" aria-label="열별 포인트 분포">' +
        COLS.map((col, i) => (ptsOf(col) ? `<i style="flex:${ptsOf(col)};background:var(--c${i + 1})" title="${col.name} ${ptsOf(col)}pt"></i>` : "")).join("") +
        '</div><div class="legend">' +
        COLS.map((col, i) => `<span><i style="background:var(--c${i + 1})"></i>${col.name} <b>${ptsOf(col)}pt</b></span>`).join("") +
        "</div>"
      : '<p class="flow-empty">카드에 포인트를 입력하면 분포가 표시돼요.</p>') +
    "</div>";

  // 주간 처리량: 최근 4주를 7일 단위로 나눠 완료한 포인트를 합친다.
  const buckets = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];
  done.forEach((c) => {
    if (!c.doneAt) return;
    const b = Math.floor((now - c.doneAt) / (7 * DAY));
    if (b >= 0 && b < 4) {
      buckets[b] += c.pts;
      counts[b]++;
    }
  });
  const mx = Math.max(1, ...buckets);
  const names = ["최근 7일", "7~14일 전", "14~21일 전", "21~28일 전"];
  const tp =
    '<div><h3>주간 처리량</h3><div class="tp-rows">' +
    [3, 2, 1, 0]
      .map(
        (b) =>
          `<div class="tp-row"><div class="l"><span>${names[b]}</span><span><b>${buckets[b]}pt</b> · ${counts[b]}건</span></div>` +
          `<div class="b"><i style="width:${buckets[b] ? ((buckets[b] / mx) * 100).toFixed(1) : 0}%"></i></div></div>`
      )
      .join("") +
    "</div></div>";

  $("#flow").innerHTML =
    "<h2>흐름 지표</h2>" + summary + dist + '<div class="flow-grid"><div><h3>남은 포인트 추이 (14일)</h3><div id="trend"></div></div>' + tp + "</div>";
  drawTrend();
}

// 14일 번다운 성격의 추이: 날짜마다 "그날 끝 기준으로 만들어졌고 아직 완료되지 않은" 카드의 포인트 합
function drawTrend() {
  const box = $("#trend");
  if (!box) return;
  const W = Math.floor(box.clientWidth);
  if (W < 120) return;
  const cards = getCards();
  const H = 176, L = 38, R = 14, T = 16, B = 24;
  const t0 = today0().getTime();
  const vals = [];
  for (let i = 13; i >= 0; i--) {
    const end = t0 - i * DAY + DAY - 1;
    vals.push(sum(cards, (c) => ((c.createdAt || 0) <= end && (!c.doneAt || c.doneAt > end) ? c.pts : 0)));
  }
  const mx = Math.max(...vals);
  if (!mx) {
    box.innerHTML = '<p class="flow-empty">포인트가 있는 카드가 생기면 추이가 표시돼요.</p>';
    return;
  }
  const top = niceMax(mx);
  const pw = W - L - R;
  const ph = H - T - B;
  const X = (i) => L + (pw * i) / 13;
  const Y = (v) => T + ph * (1 - v / top);
  const pts = vals.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1));
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 14일 남은 포인트 추이, 현재 ${vals[13]}포인트">`;
  [0, top / 2, top].forEach((v) => {
    s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="ax" x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${fmtN(v)}</text>`;
  });
  s += `<path class="area" d="M${X(0).toFixed(1)},${Y(0).toFixed(1)} L${pts.join(" L")} L${X(13).toFixed(1)},${Y(0).toFixed(1)} Z"/>`;
  s += `<path class="ln" d="M${pts.join(" L")}"/>`;
  [[0, "start"], [6, "middle"], [13, "end"]].forEach((p) => {
    s += `<text class="ax" x="${X(p[0]).toFixed(1)}" y="${H - 6}" text-anchor="${p[1]}">${md(new Date(t0 - (13 - p[0]) * DAY))}</text>`;
  });
  s += `<circle class="dot" cx="${X(13).toFixed(1)}" cy="${Y(vals[13]).toFixed(1)}" r="4.5"/>`;
  s += `<text class="endv" x="${(X(13) - 8).toFixed(1)}" y="${(Y(vals[13]) - 9).toFixed(1)}" text-anchor="end">${vals[13]}pt</text></svg>`;
  box.innerHTML = s;
}

export const insights = {
  init(cardsGetter) {
    getCards = cardsGetter;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(drawTrend, 120);
    });
  },
  render,
};
