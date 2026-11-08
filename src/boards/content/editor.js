// 콘텐츠 보드 편집창: 마감일, 우선순위, 노출·클릭
import { $ } from "../../core/util.js";

export const editorHooks = {
  blank: () => ({ pri: "mid", due: "", imp: 0, clk: 0 }),

  fill(c) {
    $("#f-due").value = c.due || "";
    $("#f-imp").value = c.imp || "";
    $("#f-clk").value = c.clk || "";
    document.querySelectorAll('input[name="pri"]').forEach((r) => {
      r.checked = r.value === c.pri;
    });
  },

  collect() {
    const imp = Math.max(0, parseInt($("#f-imp").value, 10) || 0);
    const clk = Math.max(0, parseInt($("#f-clk").value, 10) || 0);
    if (clk > imp) return { error: "클릭 수는 노출 수보다 클 수 없어요." };
    const pri = (document.querySelector('input[name="pri"]:checked') || { value: "mid" }).value;
    return { values: { pri, due: $("#f-due").value || "", imp, clk } };
  },
};
