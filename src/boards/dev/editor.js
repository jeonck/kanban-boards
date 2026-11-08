// 개발 보드 편집창: 유형, 우선순위, 담당자, 포인트, 마감일, 막힘, 링크
import { $ } from "../../core/util.js";
import { PTS, TYPES, nextKey } from "./model.js";

export const editorHooks = {
  init() {
    $("#f-type").innerHTML = Object.keys(TYPES).map((k) => `<option value="${k}">${TYPES[k].n}</option>`).join("");
    $("#f-pts").innerHTML = '<option value="0">없음</option>' + PTS.map((p) => `<option value="${p}">${p}</option>`).join("");
  },

  blank: () => ({ type: "feature", pri: "p2", assignee: "", pts: 0, due: "", link: "", blocked: false }),

  fill(c) {
    $("#f-type").value = c.type;
    $("#f-as").value = c.assignee;
    $("#f-pts").value = String(c.pts || 0);
    $("#f-due").value = c.due || "";
    $("#f-link").value = c.link || "";
    $("#f-blk").checked = !!c.blocked;
    document.querySelectorAll('input[name="pri"]').forEach((r) => {
      r.checked = r.value === c.pri;
    });
  },

  collect() {
    const link = $("#f-link").value.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      return { error: "링크는 http:// 또는 https://로 시작해야 해요.", focus: "#f-link" };
    }
    const pri = (document.querySelector('input[name="pri"]:checked') || { value: "p2" }).value;
    return {
      values: {
        type: $("#f-type").value,
        pri,
        assignee: $("#f-as").value.trim(),
        pts: parseInt($("#f-pts").value, 10) || 0,
        due: $("#f-due").value || "",
        link,
        blocked: $("#f-blk").checked,
      },
    };
  },

  // 새 카드에만 붙는 값: 다음 DEV-n 키
  newDefaults: (cards) => ({ key: nextKey(cards) }),
};
