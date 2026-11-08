// 개발 보드 내보내기·가져오기 규칙
import { cleanLabels, colName, safeId } from "../../core/model.js";
import { tsYmd } from "../../core/dates.js";
import { COLS, PRI, TYPES, norm } from "./model.js";

export const csv = {
  header: ["키", "제목", "단계", "유형", "우선순위", "담당자", "포인트", "마감일", "막힘", "링크", "라벨", "생성일", "시작일", "완료일"],
  row: (c) => [
    c.key, c.title, colName(COLS, c.col), TYPES[c.type].n, PRI[c.pri], c.assignee, c.pts || "", c.due, c.blocked ? "Y" : "",
    c.link, c.labels.join(";"), tsYmd(c.createdAt), tsYmd(c.startedAt), tsYmd(c.doneAt),
  ],
};

// 키가 없는 항목에는 기존 최대 번호 뒤로 DEV-n을 이어 붙인다.
export function parseImport(arr, { cards }) {
  const map = new Map();
  let maxKey = 0;
  cards.forEach((c) => {
    const r = /^DEV-(\d+)$/.exec(c.key || "");
    if (r && +r[1] > maxKey) maxKey = +r[1];
  });
  arr.slice(0, 2000).forEach((x, i) => {
    if (!x || typeof x !== "object" || typeof x.title !== "string" || !x.title.trim()) return;
    const c = norm({
      id: safeId(x.id),
      key: typeof x.key === "string" ? x.key : "",
      title: x.title.trim(),
      col: x.col,
      pri: x.pri,
      type: x.type,
      assignee: x.assignee,
      pts: x.pts,
      due: x.due,
      link: x.link,
      blocked: x.blocked,
      labels: cleanLabels(x.labels),
      order: +x.order || i + 1,
      createdAt: x.createdAt || Date.now(),
      startedAt: x.startedAt,
      doneAt: x.doneAt,
      sample: false,
    });
    if (!c.key) c.key = "DEV-" + ++maxKey;
    map.set(c.id, c);
  });
  return Array.from(map.values());
}
