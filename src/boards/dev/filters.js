// 개발 보드 필터: 검색어, 담당자, 유형, 막힘만 보기
import { $, esc } from "../../core/util.js";
import { TYPES } from "./model.js";

export function createFilters({ onChange }) {
  const flt = { q: "", a: "all", t: "all", b: false };

  $("#ft").innerHTML =
    '<option value="all">유형 전체</option>' + Object.keys(TYPES).map((k) => `<option value="${k}">${TYPES[k].n}</option>`).join("");

  $("#q").addEventListener("input", (e) => {
    flt.q = e.target.value.trim().toLowerCase();
    onChange();
  });
  $("#fa").addEventListener("change", (e) => {
    flt.a = e.target.value;
    onChange();
  });
  $("#ft").addEventListener("change", (e) => {
    flt.t = e.target.value;
    onChange();
  });
  $("#fb").addEventListener("click", (e) => {
    flt.b = !flt.b;
    e.currentTarget.setAttribute("aria-pressed", String(flt.b));
    onChange();
  });

  return {
    visible(c) {
      if (flt.a !== "all") {
        if (flt.a === "__none") {
          if (c.assignee) return false;
        } else if (c.assignee !== flt.a) return false;
      }
      if (flt.t !== "all" && c.type !== flt.t) return false;
      if (flt.b && !c.blocked) return false;
      if (flt.q && (c.title + " " + c.key + " " + c.assignee + " " + c.labels.join(" ")).toLowerCase().indexOf(flt.q) < 0) return false;
      return true;
    },
    // 카드에 있는 담당자 이름으로 필터 목록과 편집창 자동완성을 갱신한다.
    sync(cards) {
      const names = [];
      cards.forEach((c) => {
        if (c.assignee && names.indexOf(c.assignee) < 0) names.push(c.assignee);
      });
      names.sort();
      if (flt.a !== "all" && flt.a !== "__none" && names.indexOf(flt.a) < 0) flt.a = "all";
      const fa = $("#fa");
      fa.innerHTML =
        '<option value="all">담당자 전체</option><option value="__none">미배정</option>' +
        names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
      fa.value = flt.a;
      $("#as-list").innerHTML = names.map((n) => `<option value="${esc(n)}">`).join("");
    },
  };
}
