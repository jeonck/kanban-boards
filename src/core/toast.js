import { $ } from "./util.js";

let timer = null;

export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => {
    t.hidden = true;
  }, 3400);
}
