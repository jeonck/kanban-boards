// 개발 보드: 열(WIP 한도), 유형, 우선순위(P0~P3), 카드 정규화, 시간 기록
import { diffCard, normCommon } from "../../core/model.js";
import { hashHue, num } from "../../core/util.js";

export const COLS = [
  { id: "backlog", name: "백로그" },
  { id: "todo", name: "할 일" },
  { id: "doing", name: "진행 중", wip: 4 },
  { id: "review", name: "리뷰", wip: 3 },
  { id: "done", name: "완료" },
];
export const PRI = { p0: "P0", p1: "P1", p2: "P2", p3: "P3" };
export const PRIN = { p0: "긴급", p1: "높음", p2: "보통", p3: "낮음" };
export const TYPES = {
  feature: { n: "기능", h: 218 },
  bug: { n: "버그", h: 350 },
  chore: { n: "기술부채", h: 38 },
  infra: { n: "인프라", h: 168 },
};
export const PTS = [1, 2, 3, 5, 8, 13];
export const PRESET = ["프론트", "백엔드", "API", "DB", "CI/CD", "보안", "디자인"];

export const labelHue = hashHue;
export const colDef = (id) => COLS.find((c) => c.id === id) || COLS[0];

export function norm(c) {
  normCommon(c, COLS);
  if (!PRI[c.pri]) c.pri = "p2";
  if (!TYPES[c.type]) c.type = "feature";
  c.pts = Math.max(0, Math.floor(num(c.pts)));
  c.assignee = String(c.assignee || "").trim().slice(0, 12);
  c.link = /^https?:\/\//i.test(c.link || "") ? String(c.link).slice(0, 500) : "";
  c.blocked = !!c.blocked;
  c.createdAt = num(c.createdAt) || null;
  c.startedAt = num(c.startedAt) || null;
  c.doneAt = num(c.doneAt) || null;
  c.key = c.key ? String(c.key).slice(0, 20) : "";
  return c;
}

export const diff = (old, nw) => diffCard(old, nw, { assignee: true });

// 저장 직전 시간 기록: 진행 중으로 들어간 시각(startedAt), 완료한 시각(doneAt)
// 사이클 타임과 처리량이 이 값으로 계산된다.
export function prepare(old, nw) {
  const n = { ...nw };
  const now = Date.now();
  if (!n.createdAt) n.createdAt = now;
  if (old && old.col !== n.col) {
    if (n.col === "doing" && !n.startedAt) n.startedAt = now;
    if (n.col === "done") n.doneAt = now;
    else if (old.col === "done") n.doneAt = null;
  } else if (!old) {
    if (n.col === "doing" && !n.startedAt) n.startedAt = now;
    if (n.col === "done" && !n.doneAt) n.doneAt = now;
  }
  return n;
}

export function nextKey(cards) {
  let m = 0;
  cards.forEach((c) => {
    const r = /^DEV-(\d+)$/.exec(c.key || "");
    if (r && +r[1] > m) m = +r[1];
  });
  return "DEV-" + (m + 1);
}
