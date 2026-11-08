// 카드 편집창의 이력 타임라인.
import { DAY, esc, pad } from "./util.js";

export function dwell(ms) {
  const d = Math.floor(ms / DAY);
  if (d >= 1) return d + "일";
  const h = Math.floor(ms / 36e5);
  return h >= 1 ? h + "시간" : "1시간 미만";
}

export function fmtTime(at) {
  const d = new Date(at);
  return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function describe(e, { colName, priText }) {
  switch (e.type) {
    case "create":
      return "카드 생성 · " + colName(e.to);
    case "move":
      return colName(e.from) + " → " + colName(e.to);
    case "pri":
      return "우선순위 " + (priText(e.from) || "–") + " → " + (priText(e.to) || "–");
    case "assignee":
      return "담당자 " + (e.from || "미배정") + " → " + (e.to || "미배정");
    default:
      return "마감일 " + (e.from || "없음") + " → " + (e.to || "없음");
  }
}

// opts: { colName(id), priText(v), current(편집 중인 카드), tracked("단계 이동, …" 안내 문구) }
export function renderHistory(box, list, opts) {
  if (!list || !list.length) {
    box.innerHTML = '<p class="hist-empty">아직 기록이 없어요. 앞으로의 ' + esc(opts.tracked) + ' 변경이 여기에 쌓여요.</p>';
    return;
  }
  let enter = null;
  const items = list
    .map((e) => {
      let sub = "";
      if (e.type === "create") {
        enter = e.at;
      } else if (e.type === "move") {
        if (enter != null) sub = opts.colName(e.from) + " 단계에 " + dwell(e.at - enter) + " 머묾";
        enter = e.at;
      }
      return "<li><time>" + fmtTime(e.at) + "</time><span>" + esc(describe(e, opts)) + "</span>" + (sub ? "<em>" + esc(sub) + "</em>" : "") + "</li>";
    })
    .reverse();
  const now = enter != null && opts.current ? '<p class="hist-now">현재 ' + esc(opts.colName(opts.current.col)) + " 단계 " + dwell(Date.now() - enter) + "째</p>" : "";
  box.innerHTML = now + '<ol class="hist">' + items.join("") + "</ol>";
}
