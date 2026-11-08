// 카드 모델 공통 규칙. 보드별 norm()이 이 함수를 먼저 호출하고 자기 필드를 덧붙인다.
import { newId, num } from "./util.js";

export const ID_OK = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

export function normCommon(c, columns) {
  c.title = String(c.title || "").slice(0, 120);
  c.labels = Array.isArray(c.labels) ? c.labels.filter((l) => typeof l === "string" && l).slice(0, 8) : [];
  c.order = num(c.order);
  if (!columns.some((x) => x.id === c.col)) c.col = columns[0].id;
  c.due = /^\d{4}-\d{2}-\d{2}$/.test(c.due || "") ? c.due : "";
  c.sample = !!c.sample;
  return c;
}

export function colName(columns, id) {
  const col = columns.find((x) => x.id === id);
  return col ? col.name : id;
}

// 이력에 남길 변경: 단계 이동, 우선순위, 마감일 (옵션으로 담당자).
export function diffCard(old, nw, { assignee = false } = {}) {
  if (!old) return [{ type: "create", to: nw.col }];
  const ev = [];
  if (old.col !== nw.col) ev.push({ type: "move", from: old.col, to: nw.col });
  if (old.pri !== nw.pri) ev.push({ type: "pri", from: old.pri, to: nw.pri });
  if ((old.due || "") !== (nw.due || "")) ev.push({ type: "due", from: old.due || "", to: nw.due || "" });
  if (assignee && (old.assignee || "") !== (nw.assignee || "")) {
    ev.push({ type: "assignee", from: old.assignee || "", to: nw.assignee || "" });
  }
  return ev;
}

// 가져오기 파일의 항목을 안전한 ID와 라벨로 정리한다.
export const safeId = (id) => (typeof id === "string" && ID_OK.test(id) ? id : newId());

export const cleanLabels = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((l) => typeof l === "string" && l.trim())
    .map((l) => l.trim().slice(0, 16))
    .slice(0, 8);
