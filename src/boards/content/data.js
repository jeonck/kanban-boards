// 예시 카드. 마감일은 오늘 기준 상대값(일)이라 언제 열어도 지연·임박 상태가 섞여 보인다.
import { offsetDate, ymd } from "../../core/dates.js";
import { norm } from "./model.js";

// [열, 우선순위, 마감 오프셋(일), 라벨, 제목, 노출, 클릭]
const SRC = [
  ["idea", "mid", 12, ["뉴스레터"], "고객 인터뷰 시리즈 기획안"],
  ["idea", "low", 18, ["영상", "SNS"], "숏폼으로 바꿀 고객 후기 5건"],
  ["idea", "mid", 9, ["SEO"], "경쟁사 블로그 키워드 갭 분석"],
  ["plan", "high", 4, ["뉴스레터"], "11월 뉴스레터 편집 캘린더"],
  ["plan", "mid", 7, ["블로그", "SEO"], "신기능 소개 글 구조 잡기"],
  ["write", "high", 1, ["블로그"], "온보딩 가이드 개정판 초안"],
  ["write", "low", 3, ["SNS"], "릴리스 노트 요약 카드뉴스"],
  ["write", "mid", -1, ["블로그"], "파트너 사례 글"],
  ["review", "high", 0, ["블로그", "SEO"], "가격 정책 FAQ 정리"],
  ["review", "mid", 2, ["뉴스레터"], "웨비나 후속 메일"],
  ["publish", "mid", -3, ["블로그"], "10월 제품 업데이트 요약", 18420, 921],
  ["publish", "low", -6, ["영상"], "설정 가이드 영상", 9860, 612],
  ["publish", "high", -9, ["뉴스레터"], "신규 기능 베타 공지", 6340, 538],
  ["publish", "mid", -14, ["SEO", "블로그"], "업계 트렌드 리포트 요약", 24180, 774],
];

export function sampleCards() {
  const seen = {};
  return SRC.map((s, i) => {
    seen[s[0]] = (seen[s[0]] || 0) + 1;
    return norm({
      id: "s" + (i + 1),
      col: s[0],
      pri: s[1],
      due: ymd(offsetDate(s[2])),
      labels: s[3],
      title: s[4],
      imp: s[5] || 0,
      clk: s[6] || 0,
      order: seen[s[0]],
      sample: true,
    });
  });
}
