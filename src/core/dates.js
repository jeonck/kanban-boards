// 날짜 헬퍼. 마감일은 "YYYY-MM-DD" 문자열, 타임스탬프는 밀리초 숫자로 다룬다.
import { DAY, pad } from "./util.js";

export function today0() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseYmd(s) {
  const p = s.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

export const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const md = (d) => pad(d.getMonth() + 1) + "/" + pad(d.getDate());
export const diffDays = (s) => Math.round((parseYmd(s) - today0()) / DAY);
export const tsYmd = (t) => (t ? ymd(new Date(t)) : "");

// 오늘로부터 n일 뒤 날짜 (서머타임 경계에서도 자정 기준으로 맞춘다).
export function offsetDate(n) {
  const d = new Date(today0().getTime() + n * DAY);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
