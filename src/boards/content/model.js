// 콘텐츠 보드: 열, 우선순위, 라벨, 카드 정규화
import { diffCard, normCommon } from "../../core/model.js";
import { hashHue, num } from "../../core/util.js";

export const COLS = [
  { id: "idea", name: "아이디어" },
  { id: "plan", name: "기획" },
  { id: "write", name: "작성" },
  { id: "review", name: "검토" },
  { id: "publish", name: "발행" },
];
export const PRI = { high: "높음", mid: "보통", low: "낮음" };
export const PRESET = ["블로그", "뉴스레터", "영상", "SNS", "SEO"];

const HUES = { 블로그: 200, 뉴스레터: 32, 영상: 350, SNS: 262, SEO: 150 };
export const labelHue = (l) => (HUES[l] != null ? HUES[l] : hashHue(l));

export function norm(c) {
  normCommon(c, COLS);
  if (!PRI[c.pri]) c.pri = "mid";
  c.imp = Math.max(0, Math.floor(num(c.imp)));
  c.clk = Math.max(0, Math.floor(num(c.clk)));
  return c;
}

export const diff = (old, nw) => diffCard(old, nw);
