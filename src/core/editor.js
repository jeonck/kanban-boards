// 카드 편집창. 제목·단계·라벨·이력·삭제는 공통이고, 나머지 입력칸은 보드의 hooks가 맡는다.
//
// hooks.init()             선택지 채우기 (선택)
// hooks.blank()            새 카드의 기본값
// hooks.fill(card)         보드 전용 입력칸에 값 채우기
// hooks.collect()          { error, focus } 또는 { values } 반환
// hooks.newDefaults(cards) 새 카드에만 붙는 값, 예: 키 (선택)
import { $, esc, newId } from "./util.js";
import { colName } from "./model.js";
import { renderHistory } from "./history-view.js";

export function attachEditor({ store, columns, labelHue, presetLabels, priText, tracked, hooks }) {
  const els = {
    scrim: $("#scrim"),
    form: $("#form"),
    head: $("#m-head"),
    title: $("#f-title"),
    col: $("#f-col"),
    newLabel: $("#f-new"),
    chips: $("#chips"),
    histWrap: $("#hist-wrap"),
    histBox: $("#hist-box"),
    err: $("#m-err"),
    del: $("#btn-del"),
  };
  const selected = new Set();
  let editing = null;
  let lastFocus = null;
  let delArmed = false;
  let delTimer = null;

  els.col.innerHTML = columns.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  if (hooks.init) hooks.init();

  function allLabels() {
    const s = presetLabels.slice();
    store.cards.forEach((c) => c.labels.forEach((l) => { if (s.indexOf(l) < 0) s.push(l); }));
    selected.forEach((l) => { if (s.indexOf(l) < 0) s.push(l); });
    return s;
  }

  function renderChips() {
    els.chips.innerHTML = allLabels()
      .map((l) => `<button type="button" class="chip" data-l="${esc(l)}" style="--h:${labelHue(l)}" aria-pressed="${selected.has(l)}">${esc(l)}</button>`)
      .join("");
  }

  function resetDel() {
    delArmed = false;
    clearTimeout(delTimer);
    els.del.textContent = "삭제";
    els.del.classList.remove("armed");
  }

  function open(id, col) {
    editing = id ? store.find(id) || null : null;
    const c = editing || { title: "", col: col || columns[0].id, labels: [], ...hooks.blank() };
    selected.clear();
    c.labels.forEach((l) => selected.add(l));
    els.head.innerHTML = (editing ? "카드 편집" : "새 카드") + (editing && editing.key ? "<small>" + esc(editing.key) + "</small>" : "");
    els.title.value = c.title;
    els.col.value = c.col;
    els.newLabel.value = "";
    hooks.fill(c);
    renderChips();
    els.err.textContent = "";
    els.histWrap.hidden = !editing;
    if (editing) {
      const hid = editing.id;
      const show = (list) => {
        if (editing && editing.id === hid) {
          renderHistory(els.histBox, list, { colName: (x) => colName(columns, x), priText, current: editing, tracked });
        }
      };
      els.histBox.innerHTML = '<p class="hist-empty">불러오는 중…</p>';
      store.history.fetch(hid).then(show).catch(() => show([]));
    }
    els.del.hidden = !editing;
    resetDel();
    lastFocus = document.activeElement;
    els.scrim.hidden = false;
    setTimeout(() => els.title.focus(), 0);
  }

  function close() {
    els.scrim.hidden = true;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }

  function addLabel() {
    const v = els.newLabel.value.trim();
    if (!v) return;
    selected.add(v);
    els.newLabel.value = "";
    renderChips();
  }

  els.chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const l = b.dataset.l;
    if (selected.has(l)) selected.delete(l);
    else selected.add(l);
    renderChips();
  });
  els.newLabel.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLabel();
    }
  });
  $("#f-new-btn").addEventListener("click", addLabel);
  $("#btn-cancel").addEventListener("click", close);
  els.scrim.addEventListener("pointerdown", (e) => {
    if (e.target === els.scrim) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.scrim.hidden) close();
  });

  // 삭제는 두 번 눌러야 실행된다.
  els.del.addEventListener("click", () => {
    if (!delArmed) {
      delArmed = true;
      els.del.textContent = "정말 삭제할까요?";
      els.del.classList.add("armed");
      clearTimeout(delTimer);
      delTimer = setTimeout(resetDel, 3000);
      return;
    }
    const id = editing && editing.id;
    close();
    if (id) store.removeMany([id]);
  });

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fail = (msg, focus) => {
      els.err.textContent = msg;
      if (focus) $(focus).focus();
    };
    const title = els.title.value.trim();
    if (!title) return fail("제목을 입력해 주세요.", "#f-title");
    const r = hooks.collect();
    if (r.error) return fail(r.error, r.focus);
    const col = els.col.value;
    const base = { ...r.values, title, col, labels: Array.from(selected), sample: false };
    let card;
    if (editing) {
      card = { ...editing, ...base };
      if (col !== editing.col) card.order = store.nextOrder(col);
    } else {
      card = { id: newId(), order: store.nextOrder(col), ...(hooks.newDefaults ? hooks.newDefaults(store.cards) : {}), ...base };
    }
    close();
    await store.save(card);
  });

  return { open, close };
}
