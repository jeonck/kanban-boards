// 개발 보드: 카드 HTML (키, 유형, 막힘, P0~P3, 담당자, 포인트, 마감, 링크, 라벨)
import { diffDays, md } from "../../core/dates.js";
import { esc } from "../../core/util.js";
import { PRI, PRIN, TYPES, labelHue } from "./model.js";

export function dueInfo(c) {
  if (c.col === "done") return c.doneAt ? { cls: "done", text: "완료 " + md(new Date(c.doneAt)) } : null;
  if (!c.due) return null;
  const m = c.due.slice(5).replace("-", "/");
  const d = diffDays(c.due);
  if (d < 0) return { cls: "late", text: "D+" + -d + " 지연 · " + m };
  if (d === 0) return { cls: "today", text: "오늘 · " + m };
  return { cls: d <= 3 ? "soon" : "", text: "D-" + d + " · " + m };
}

// 링크 표시: GitHub 주소면 "PR #142", "이슈 #44"처럼 줄인다.
export function linkLabel(u) {
  try {
    const x = new URL(u);
    const m = x.pathname.match(/\/(pull|issues|merge_requests)\/(\d+)/);
    if (m) return (m[1] === "issues" ? "이슈" : m[1] === "pull" ? "PR" : "MR") + " #" + m[2];
    return x.hostname.replace(/^www\./, "");
  } catch (e) {
    return "링크";
  }
}

const avatar = (n) =>
  n ? `<span class="av" style="--h:${labelHue(n)}">${esc(Array.from(n)[0].toUpperCase())}</span>` : '<span class="av none">?</span>';

export function cardHtml(c) {
  const d = dueInfo(c);
  const t = TYPES[c.type];
  const meta =
    `<span class="as">${avatar(c.assignee)}${c.assignee ? esc(c.assignee) : "미배정"}</span>` +
    (c.pts ? `<span class="pt" title="포인트">${c.pts}</span>` : "") +
    (d ? `<span class="due ${d.cls}">${d.text}</span>` : "") +
    (c.link ? `<a class="lk" href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">↗ ${esc(linkLabel(c.link))}</a>` : "");
  const labels = c.labels.length
    ? '<div class="labels">' + c.labels.map((l) => `<span class="lb" style="--h:${labelHue(l)}">${esc(l)}</span>`).join("") + "</div>"
    : "";
  return (
    `<article class="card${c.blocked ? " is-blocked" : ""}" data-id="${esc(c.id)}" tabindex="0" aria-label="${esc((c.key ? c.key + " " : "") + c.title)}, ${PRI[c.pri]} ${PRIN[c.pri]}${c.blocked ? ", 막힘" : ""}">` +
    `<div class="c-top">${c.key ? `<span class="key">${esc(c.key)}</span>` : ""}<span class="tp" style="--h:${t.h}">${t.n}</span>` +
    `${c.blocked ? '<span class="blk-t">막힘</span>' : ""}<span class="pri ${c.pri}" title="${PRIN[c.pri]}">${PRI[c.pri]}</span></div>` +
    `<h3 class="title">${esc(c.title)}</h3><div class="meta">${meta}</div>${labels}</article>`
  );
}
