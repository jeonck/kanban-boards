// 보드 공통 유틸. DOM 조회, 이스케이프, 숫자·ID 헬퍼.

export const DAY = 864e5;
export const $ = (sel, root = document) => root.querySelector(sel);
export const pad = (n) => String(n).padStart(2, "0");

export const num = (v) => {
  v = +v;
  return Number.isFinite(v) ? v : 0;
};

export const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);

export const newId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);

export function hashHue(label) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) % 360;
  return h;
}

// 차트 축 최댓값을 1, 2, 2.5, 5, 10 배수로 맞춘다.
export function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// CSV 한 칸. 수식으로 해석될 수 있는 값은 앞에 작은따옴표를 붙인다.
export function csvCell(v) {
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
