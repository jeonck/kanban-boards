// 예시 카드 18장. d(마감), cr/st/dn(생성·시작·완료)은 지금 기준 상대 일수라 언제 열어도 흐름 지표가 채워진다.
import { DAY } from "../../core/util.js";
import { offsetDate, ymd } from "../../core/dates.js";
import { norm } from "./model.js";

const SRC = [
  { k: 1, t: "프로젝트 초기 설정·린트 규칙", c: "done", p: "p2", ty: "infra", a: "지호", pt: 2, d: null, l: "", b: false, lb: ["CI/CD"], cr: -28, st: -26, dn: -22 },
  { k: 2, t: "회원가입 API", c: "done", p: "p1", ty: "feature", a: "서연", pt: 5, d: null, l: "https://github.com/acme/app/pull/31", b: false, lb: ["백엔드", "API"], cr: -26, st: -23, dn: -17 },
  { k: 3, t: "로그인 화면 UI", c: "done", p: "p1", ty: "feature", a: "하은", pt: 3, d: null, l: "", b: false, lb: ["프론트"], cr: -25, st: -21, dn: -15 },
  { k: 4, t: "배포 파이프라인 구축", c: "done", p: "p1", ty: "infra", a: "지호", pt: 8, d: null, l: "", b: false, lb: ["CI/CD"], cr: -24, st: -20, dn: -11 },
  { k: 5, t: "비밀번호 재설정 메일 미발송", c: "done", p: "p0", ty: "bug", a: "민준", pt: 1, d: null, l: "https://github.com/acme/app/issues/44", b: false, lb: ["백엔드"], cr: -9, st: -8, dn: -7 },
  { k: 6, t: "알림 설정 화면", c: "done", p: "p2", ty: "feature", a: "하은", pt: 3, d: null, l: "", b: false, lb: ["프론트"], cr: -16, st: -11, dn: -4 },
  { k: 7, t: "에러 로깅 연동", c: "done", p: "p2", ty: "infra", a: "서연", pt: 2, d: null, l: "", b: false, lb: ["백엔드"], cr: -12, st: -6, dn: -2 },
  { k: 8, t: "프로필 이미지 업로드", c: "review", p: "p2", ty: "feature", a: "하은", pt: 5, d: 1, l: "https://github.com/acme/app/pull/142", b: false, lb: ["프론트", "백엔드"], cr: -14, st: -8, dn: null },
  { k: 9, t: "세션 만료 처리 리팩터링", c: "review", p: "p2", ty: "chore", a: "민준", pt: 3, d: -1, l: "https://github.com/acme/app/pull/139", b: false, lb: ["백엔드"], cr: -13, st: -7, dn: null },
  { k: 10, t: "검색 API 페이지네이션", c: "doing", p: "p1", ty: "feature", a: "민준", pt: 5, d: 3, l: "", b: false, lb: ["백엔드", "API"], cr: -15, st: -3, dn: null },
  { k: 11, t: "로그인 실패 시 500 응답", c: "doing", p: "p0", ty: "bug", a: "서연", pt: 2, d: 0, l: "https://github.com/acme/app/issues/57", b: false, lb: ["백엔드"], cr: -2, st: -1, dn: null },
  { k: 12, t: "CI 캐시 설정으로 빌드 시간 단축", c: "doing", p: "p2", ty: "infra", a: "지호", pt: 3, d: 5, l: "", b: true, lb: ["CI/CD"], cr: -10, st: -4, dn: null },
  { k: 13, t: "결제 웹훅 재시도 로직", c: "todo", p: "p1", ty: "feature", a: "서연", pt: 5, d: 4, l: "", b: false, lb: ["백엔드", "API"], cr: -12, st: null, dn: null },
  { k: 14, t: "모바일 메뉴 포커스 이동 오류", c: "todo", p: "p1", ty: "bug", a: "지호", pt: 2, d: 2, l: "https://github.com/acme/app/issues/61", b: false, lb: ["프론트"], cr: -3, st: null, dn: null },
  { k: 15, t: "릴리스 노트 자동 생성", c: "todo", p: "p3", ty: "infra", a: "하은", pt: 3, d: 9, l: "", b: false, lb: ["CI/CD"], cr: -8, st: null, dn: null },
  { k: 16, t: "OAuth 소셜 로그인", c: "backlog", p: "p2", ty: "feature", a: "", pt: 8, d: null, l: "", b: false, lb: ["백엔드", "보안"], cr: -9, st: null, dn: null },
  { k: 17, t: "대시보드 차트 로딩 성능 개선", c: "backlog", p: "p3", ty: "chore", a: "", pt: 5, d: null, l: "", b: false, lb: ["프론트"], cr: -6, st: null, dn: null },
  { k: 18, t: "스테이징 DB 백업 자동화", c: "backlog", p: "p2", ty: "infra", a: "", pt: 3, d: null, l: "", b: false, lb: ["DB", "CI/CD"], cr: -4, st: null, dn: null },
];

export function sampleCards() {
  const now = Date.now();
  const rel = (n) => (n == null ? null : now + n * DAY);
  const seen = {};
  return SRC.map((s) => {
    seen[s.c] = (seen[s.c] || 0) + 1;
    return norm({
      id: "s" + s.k,
      key: "DEV-" + s.k,
      title: s.t,
      col: s.c,
      pri: s.p,
      type: s.ty,
      assignee: s.a,
      pts: s.pt,
      due: s.d == null ? "" : ymd(offsetDate(s.d)),
      link: s.l,
      blocked: s.b,
      labels: s.lb,
      order: seen[s.c],
      createdAt: rel(s.cr),
      startedAt: rel(s.st),
      doneAt: rel(s.dn),
      sample: true,
    });
  });
}
