// 콘텐츠 보드 필터: 검색어 + 우선순위
import { $ } from "../../core/util.js";

export function createFilters({ onChange }) {
  const flt = { q: "", p: "all" };
  $("#q").addEventListener("input", (e) => {
    flt.q = e.target.value.trim().toLowerCase();
    onChange();
  });
  $("#pf").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    flt.p = b.dataset.p;
    Array.from($("#pf").children).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    onChange();
  });
  return {
    visible(c) {
      if (flt.p !== "all" && c.pri !== flt.p) return false;
      if (flt.q && (c.title + " " + c.labels.join(" ")).toLowerCase().indexOf(flt.q) < 0) return false;
      return true;
    },
  };
}
