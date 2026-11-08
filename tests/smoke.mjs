// 스모크 테스트: 빌드된 dist/*.html을 jsdom에서 실제로 실행해 핵심 흐름을 확인한다.
//  - 로컬 모드(아티팩트 기능 없음): 렌더, 편집·저장, 드래그, 필터, 예시 삭제·복원
//  - DB 모드(가짜 db + downloads): 기존 배포 데이터 형태 읽기, 저장·이동·삭제, 이력, 내보내기·가져오기
// 사용법: node tests/smoke.mjs
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
let total = 0;

function check(name, cond, extra) {
  total++;
  if (cond) return;
  failures++;
  console.log(`  FAIL ${name}${extra !== undefined ? " → " + JSON.stringify(extra) : ""}`);
}

/* 가짜 db: 아티팩트 db 캐퍼빌리티와 같은 모양(컬렉션, where/limit/get, onSnapshot, add) */
function makeDb(seedCards = {}) {
  const data = { cards: new Map(Object.entries(seedCards)), history: new Map() };
  const subs = { cards: new Set(), history: new Set() };
  let n = 0;
  const snap = (name) => {
    const docs = [...data[name]].map(([id, v]) => ({ id, exists: true, data: () => v, metadata: {} }));
    return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false } };
  };
  const notify = (name) => subs[name].forEach((f) => f(snap(name)));
  const query = (name, filters, lim) => ({
    where: (f, op, v) => query(name, [...filters, [f, v]], lim),
    limit: (k) => query(name, filters, k),
    async get() {
      const s = snap(name);
      const docs = s.docs.filter((d) => filters.every(([f, v]) => d.data()[f] === v)).slice(0, lim);
      return { docs, size: docs.length, empty: !docs.length, metadata: s.metadata };
    },
    onSnapshot(next) {
      subs[name].add(next);
      setTimeout(() => next(snap(name)), 0);
      return () => subs[name].delete(next);
    },
  });
  const collection = (name) => ({
    ...query(name, [], 1000),
    doc: (id) => ({
      id,
      async set(d) { data[name].set(id, JSON.parse(JSON.stringify(d))); notify(name); },
      async delete() { data[name].delete(id); notify(name); },
    }),
    async add(d) {
      const id = "h" + ++n;
      data[name].set(id, JSON.parse(JSON.stringify(d)));
      notify(name);
      return { id };
    },
  });
  return { collection, data };
}

async function boot(file, { db } = {}) {
  const html = await readFile(path.join(root, file), "utf8");
  const errors = [];
  const saves = [];
  const dom = new JSDOM("<!doctype html><html><head><meta charset=utf8></head><body>" + html + "</body></html>", {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "https://artifact.test/",
    beforeParse(w) {
      w.addEventListener("error", (e) => errors.push(String((e.error && e.error.stack) || e.message)));
      if (db) {
        w.claude = {
          use: async (name) =>
            name === "db" ? db : name === "downloads" ? { save: async (f) => { saves.push(f); return { status: "saved" }; } } : null,
        };
      }
      w.Element.prototype.scrollTo = function (o) { this.__scrolled = o; };
    },
  });
  await wait(120);
  return { win: dom.window, doc: dom.window.document, errors, saves };
}

const $ = (d, s) => d.querySelector(s);
const $$ = (d, s) => [...d.querySelectorAll(s)];

function fireClick(win, el) {
  el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
}
function submit(win, doc) {
  doc.querySelector("#form").dispatchEvent(new win.Event("submit", { cancelable: true, bubbles: true }));
}
function pointer(win, target, type, x, y) {
  const e = new win.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, "pointerType", { value: "mouse" });
  target.dispatchEvent(e);
}
async function dragCard(win, doc, cardId, toCol) {
  const card = $(doc, `.card[data-id="${cardId}"]`);
  const colEl = $(doc, `.col[data-col="${toCol}"]`);
  doc.elementFromPoint = () => colEl;
  pointer(win, card, "pointerdown", 10, 10);
  pointer(win, doc, "pointermove", 30, 30);
  pointer(win, doc, "pointermove", 220, 220);
  pointer(win, doc, "pointerup", 220, 220);
  await wait(120);
}
const colOf = (doc, id) => {
  const c = $(doc, `.card[data-id="${id}"]`);
  return c ? c.closest(".col").dataset.col : null;
};

/* 보드별 기대값과 입력 방법 */
const BOARDS = {
  content: {
    file: "dist/content-board.html",
    samples: 14,
    firstCol: "idea",
    movable: { id: "s1", to: "write" },
    // 현재 배포된 DB의 문서 모양(sample 필드 없음)
    legacy: {
      s1: { col: "idea", pri: "mid", due: "2026-11-06", labels: ["뉴스레터"], title: "고객 인터뷰 시리즈 기획안", imp: 0, clk: 0, order: 1 },
      s11: { col: "publish", pri: "mid", due: "2026-10-22", labels: ["블로그"], title: "10월 제품 업데이트 요약", imp: 18420, clk: 921, order: 1 },
    },
    fillNew(doc, title) {
      $(doc, "#f-title").value = title;
      $(doc, 'input[name="pri"][value="high"]').checked = true;
      $(doc, "#f-imp").value = "1000";
      $(doc, "#f-clk").value = "50";
    },
    legacyChecks(doc) {
      check("content: 기존 문서의 성과 행 1개", $$(doc, "#perf .row").length === 1);
      check("content: 총 노출 18,420", $(doc, "#perf .p-sum").textContent.includes("18,420"));
    },
    specific(doc, win) {
      // 클릭이 노출보다 크면 저장하지 않는다.
      fireClick(win, $(doc, ".card"));
      $(doc, "#f-imp").value = "10";
      $(doc, "#f-clk").value = "20";
      submit(win, doc);
      check("content: 클릭>노출 검증 메시지", $(doc, "#m-err").textContent.includes("클릭 수는 노출 수보다"));
      fireClick(win, $(doc, "#btn-cancel"));
    },
  },
  dev: {
    file: "dist/dev-board.html",
    samples: 18,
    firstCol: "backlog",
    movable: { id: "s16", to: "doing" },
    legacy: {
      s12: { assignee: "지호", blocked: true, col: "doing", createdAt: 1792115901291, due: "2026-10-30", key: "DEV-12", labels: ["CI/CD"], link: "", order: 3, pri: "p2", pts: 3, sample: true, startedAt: 1792634301291, title: "CI 캐시 설정으로 빌드 시간 단축", type: "infra" },
      s16: { assignee: "", blocked: false, col: "backlog", createdAt: 1792115901291, due: "", key: "DEV-16", labels: ["백엔드", "보안"], link: "", order: 1, pri: "p2", pts: 8, sample: true, title: "OAuth 소셜 로그인", type: "feature" },
    },
    fillNew(doc, title) {
      $(doc, "#f-title").value = title;
      $(doc, 'input[name="pri"][value="p1"]').checked = true;
      $(doc, "#f-as").value = "민준";
      $(doc, "#f-pts").value = "3";
    },
    legacyChecks(doc) {
      check("dev: 막힘 표시", $$(doc, ".blk-t").length === 1);
      check("dev: 담당자 필터에 지호", $$(doc, "#fa option").some((o) => o.value === "지호"));
    },
    specific(doc, win) {
      fireClick(win, $(doc, ".card"));
      $(doc, "#f-link").value = "javascript:alert(1)";
      submit(win, doc);
      check("dev: 잘못된 링크 거부", $(doc, "#m-err").textContent.includes("http"));
      fireClick(win, $(doc, "#btn-cancel"));
    },
  },
};

async function localMode(id, b) {
  console.log(`[${id}] 로컬 모드`);
  const { win, doc, errors } = await boot(b.file);
  check("5개 열", $$(doc, ".col").length === 5);
  check("단계 탭 5개", $$(doc, "#stages button").length === 5);
  check(`예시 카드 ${b.samples}장`, $$(doc, ".card").length === b.samples, $$(doc, ".card").length);
  check("저장 위치 안내", $(doc, "#sub").textContent.includes("이 기기에만"));
  check("예시 카드 안내 배너", !!$(doc, "#clear-sample"));
  check("내보내기 버튼은 숨김", $(doc, "#ex-json").hidden === true);
  check("이전 헤더 구조(.top-r1)", !!$(doc, ".top-r1 #add"));

  // 편집 → 저장
  fireClick(win, $(doc, ".card"));
  check("편집창 열림", $(doc, "#scrim").hidden === false);
  const firstId = $(doc, ".card").dataset.id;
  $(doc, "#f-title").value = "제목 수정 테스트";
  submit(win, doc);
  await wait();
  check("제목 수정 반영", $(doc, `.card[data-id="${firstId}"] .title`).textContent === "제목 수정 테스트");
  check("저장 후 편집창 닫힘", $(doc, "#scrim").hidden === true);
  b.specific(doc, win);

  // 새 카드
  fireClick(win, $(doc, "#add"));
  b.fillNew(doc, "새 카드 <b>x</b>");
  submit(win, doc);
  await wait();
  check("새 카드 추가", $$(doc, ".card").length === b.samples + 1);
  check("제목 HTML 이스케이프", !$(doc, ".title b") && $$(doc, ".title").some((t) => t.textContent === "새 카드 <b>x</b>"));
  check("새 카드는 첫 열", colOf(doc, $$(doc, ".card").find((c) => c.querySelector(".title").textContent.startsWith("새 카드")).dataset.id) === b.firstCol);

  // 드래그로 이동 + 이력
  const { id: mid, to } = b.movable;
  await dragCard(win, doc, mid, to);
  check(`드래그로 ${mid} → ${to}`, colOf(doc, mid) === to, colOf(doc, mid));
  fireClick(win, $(doc, `.card[data-id="${mid}"]`));
  await wait();
  check("이력에 단계 이동 기록", $(doc, "#hist-box").textContent.includes("→"), $(doc, "#hist-box").textContent);
  fireClick(win, $(doc, "#btn-cancel"));

  // 필터(검색)
  const q = $(doc, "#q");
  q.value = "zzzz없는검색어";
  q.dispatchEvent(new win.Event("input", { bubbles: true }));
  check("검색 결과 없음", $$(doc, ".card").length === 0);
  check("빈 열 안내", $$(doc, ".empty").length === 5);
  q.value = "";
  q.dispatchEvent(new win.Event("input", { bubbles: true }));
  check("검색 해제", $$(doc, ".card").length === b.samples + 1);

  // 단계 탭
  fireClick(win, $(doc, '#stages [data-go="review"]'));
  check("단계 탭 클릭 → 스크롤 호출", !!$(doc, "#board").__scrolled);

  // 예시 삭제(2번 눌러야 삭제) → 빈 보드 → 예시 복원
  fireClick(win, $(doc, "#clear-sample"));
  check("삭제 1번 눌러서는 유지", $$(doc, ".card").length === b.samples + 1);
  fireClick(win, $(doc, "#clear-sample"));
  await wait();
  check("예시 삭제 후 사용자 카드(수정한 카드 + 새 카드) 2장만 남음", $$(doc, ".card").length === 2, $$(doc, ".card").length);
  check("에러 없음", errors.length === 0, errors);
}

async function dbMode(id, b) {
  console.log(`[${id}] DB 모드`);
  const db = makeDb(b.legacy);
  const { win, doc, errors, saves } = await boot(b.file, { db });
  const ids = Object.keys(b.legacy);
  check("기존 문서만큼 렌더", $$(doc, ".card").length === ids.length, $$(doc, ".card").length);
  check("로컬 안내 없음", !$(doc, "#sub").textContent.includes("이 기기에만"));
  check("내보내기 버튼 표시", $(doc, "#ex-json").hidden === false);
  b.legacyChecks(doc);

  // 새 카드 → db 문서 + create 이력
  fireClick(win, $(doc, "#add"));
  b.fillNew(doc, "DB 저장 테스트");
  submit(win, doc);
  await wait(150);
  const added = [...db.data.cards].find(([, v]) => v.title === "DB 저장 테스트");
  check("새 카드가 db에 저장", !!added);
  check("저장된 문서에 id 필드 없음", added && !("id" in added[1]));
  check("create 이력 기록", [...db.data.history.values()].some((h) => h.type === "create" && h.cardId === (added && added[0])));

  // 드래그 → db 열 변경 + move 이력
  const { id: mid, to } = b.movable;
  await dragCard(win, doc, mid, to);
  check("드래그 결과가 db에 반영", db.data.cards.get(mid).col === to, db.data.cards.get(mid).col);
  check("move 이력 기록", [...db.data.history.values()].some((h) => h.type === "move" && h.cardId === mid && h.to === to));
  if (id === "dev") check("진행 중 이동 시 startedAt 기록", typeof db.data.cards.get(mid).startedAt === "number");

  // 내보내기
  fireClick(win, $(doc, "#ex-json"));
  await wait();
  const json = saves.find((s) => s.filename.endsWith(".json"));
  check("JSON 내보내기 파일명", !!json && /^[a-z]+-board-\d{4}-\d{2}-\d{2}\.json$/.test(json.filename), json && json.filename);
  const payload = json ? JSON.parse(json.data) : { cards: [] };
  check("내보낸 카드 수", payload.cards.length === ids.length + 1, payload.cards.length);
  check("내보내기에 sample 필드 없음", payload.cards.every((c) => !("sample" in c)));
  fireClick(win, $(doc, "#ex-csv"));
  await wait();
  const csvFile = saves.find((s) => s.filename.endsWith(".csv"));
  check("CSV는 BOM으로 시작", !!csvFile && csvFile.data.charCodeAt(0) === 0xfeff);
  check("CSV 행 수(헤더 포함)", csvFile && csvFile.data.split("\r\n").length === ids.length + 2, csvFile && csvFile.data.split("\r\n").length);

  // 가져오기: 합치기 / 전체 교체
  const importFile = async (obj) => {
    const input = $(doc, "#im-file");
    const text = JSON.stringify(obj);
    Object.defineProperty(input, "files", { configurable: true, value: [{ size: text.length, text: async () => text }] });
    input.dispatchEvent(new win.Event("change", { bubbles: true }));
    await wait();
  };
  await importFile({ cards: [{ title: "가져온 카드 A", col: "nope", pri: "zzz", imp: 5, clk: 50 }, { title: "  " }, { nothing: 1 }] });
  check("가져오기 패널 표시(유효 1장)", $(doc, "#im-panel").textContent.includes("1장"), $(doc, "#im-panel").textContent);
  fireClick(win, $(doc, '[data-im="merge"]'));
  await wait(150);
  const imp = [...db.data.cards.values()].find((v) => v.title === "가져온 카드 A");
  check("합치기: 카드 추가", !!imp);
  check("잘못된 열·우선순위는 기본값으로", imp && imp.col === b.firstCol && imp.pri !== "zzz", imp);
  if (id === "content") check("클릭은 노출을 넘지 않음", imp && imp.clk <= imp.imp, imp);
  if (id === "dev") check("키가 없으면 DEV-n 자동 부여", imp && /^DEV-\d+$/.test(imp.key), imp && imp.key);
  await importFile({ cards: [{ id: "keep1", title: "교체 후 남을 카드", col: b.firstCol }] });
  fireClick(win, $(doc, '[data-im="replace"]'));
  await wait(200);
  check("전체 교체: 카드 1장만 남음", db.data.cards.size === 1 && db.data.cards.has("keep1"), [...db.data.cards.keys()]);
  check("전체 교체: 지운 카드의 이력도 삭제", [...db.data.history.values()].every((h) => h.cardId === "keep1" || !ids.concat([mid]).includes(h.cardId)));
  check("화면도 1장", $$(doc, ".card").length === 1);

  // 삭제(두 번 눌러야 삭제)
  fireClick(win, $(doc, ".card"));
  fireClick(win, $(doc, "#btn-del"));
  check("삭제 1번: 확인 문구", $(doc, "#btn-del").textContent.includes("정말"));
  fireClick(win, $(doc, "#btn-del"));
  await wait(150);
  check("삭제 2번: db에서 제거", db.data.cards.size === 0);
  check("빈 보드 안내 + 예시 시작 버튼", !!$(doc, "#seed"));
  fireClick(win, $(doc, "#seed"));
  await wait(400);
  check(`예시로 시작: ${b.samples}장 저장`, db.data.cards.size === b.samples, db.data.cards.size);
  check("에러 없음", errors.length === 0, errors);
}

for (const [id, b] of Object.entries(BOARDS)) {
  await localMode(id, b);
  await dbMode(id, b);
}
console.log(failures ? `\n${failures}/${total} 검사 실패` : `\n${total}개 검사 모두 통과`);
process.exit(failures ? 1 : 0);
