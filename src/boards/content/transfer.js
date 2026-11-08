// 콘텐츠 보드 내보내기·가져오기 규칙
import { cleanLabels, colName, safeId } from "../../core/model.js";
import { COLS, PRI, norm } from "./model.js";

export const csv = {
  header: ["제목", "단계", "우선순위", "마감일", "라벨", "노출", "클릭", "CTR"],
  row: (c) => [c.title, colName(COLS, c.col), PRI[c.pri], c.due, c.labels.join(";"), c.imp, c.clk, c.imp > 0 ? ((c.clk / c.imp) * 100).toFixed(2) + "%" : ""],
};

export function parseImport(arr) {
  const map = new Map();
  arr.slice(0, 2000).forEach((x, i) => {
    if (!x || typeof x !== "object" || typeof x.title !== "string" || !x.title.trim()) return;
    const imp = Math.max(0, Math.floor(+x.imp || 0));
    const clk = Math.min(imp, Math.max(0, Math.floor(+x.clk || 0)));
    const c = norm({
      id: safeId(x.id),
      title: x.title.trim(),
      col: x.col,
      pri: x.pri,
      due: x.due,
      labels: cleanLabels(x.labels),
      imp,
      clk,
      order: +x.order || i + 1,
    });
    map.set(c.id, c);
  });
  return Array.from(map.values());
}
