// 저장소. 아티팩트 db(cards, history 컬렉션)를 쓰고, 쓸 수 없으면 localStorage로 내려간다.
import { toast } from "./toast.js";

export function createStore(cfg) {
  const { lsKey, norm, sample, diff, prepare, saved, onChange } = cfg;
  let cards = sample();
  let mode = "preview"; // preview(불러오는 중) | db | local
  let coll = null;
  let hist = null;
  let histLocal = [];
  const queues = new Map();

  /* 로컬 저장 */
  const persistLocal = () => {
    try {
      localStorage.setItem(lsKey, JSON.stringify(cards));
    } catch (e) {}
  };
  const loadHistLocal = () => {
    try {
      const r = localStorage.getItem(lsKey + "-h");
      histLocal = r ? JSON.parse(r) : [];
      if (!Array.isArray(histLocal)) histLocal = [];
    } catch (e) {
      histLocal = [];
    }
  };
  const saveHistLocal = () => {
    try {
      localStorage.setItem(lsKey + "-h", JSON.stringify(histLocal.slice(-2000)));
    } catch (e) {}
  };

  /* 같은 문서에 대한 쓰기는 순서대로 하나씩 */
  const queue = (id, fn) => {
    const prev = queues.get(id) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    queues.set(id, next);
    return next;
  };

  function fail(e) {
    toast(e && e.code === "invalid_argument" ? "이 보드를 수정할 권한이 없어요." : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (coll) coll.get().then(applySnap).catch(() => {});
  }

  function applySnap(snap) {
    cards = snap.docs.map((d) => norm({ id: d.id, ...d.data() }));
    onChange();
  }

  function guard() {
    if (mode === "preview") {
      toast("불러오는 중이에요. 잠시 후 다시 시도해 주세요.");
      return false;
    }
    return true;
  }

  const find = (id) => cards.find((c) => c.id === id);

  function nextOrder(col) {
    let m = 0;
    cards.forEach((c) => {
      if (c.col === col && c.order > m) m = c.order;
    });
    return m + 1;
  }

  /* 이력 */
  async function logEvents(cardId, evs) {
    if (!evs.length) return;
    const at = Date.now();
    for (let i = 0; i < evs.length; i++) {
      const e = { cardId, at: at + i, ...evs[i] };
      if (mode === "db" && hist) {
        try {
          await hist.add(e);
        } catch (x) {}
      } else {
        histLocal.push({ id: "h" + at + i, ...e });
        saveHistLocal();
      }
    }
  }

  async function fetchHistory(id) {
    let list;
    if (mode === "db" && hist) {
      const snap = await hist.where("cardId", "==", id).limit(300).get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      list = histLocal.filter((e) => e.cardId === id);
    }
    return list.sort((a, b) => a.at - b.at);
  }

  async function purgeHistory(id) {
    try {
      if (mode === "db" && hist) {
        const snap = await hist.where("cardId", "==", id).limit(500).get();
        for (const d of snap.docs) await hist.doc(d.id).delete();
      } else {
        histLocal = histLocal.filter((e) => e.cardId !== id);
        saveHistLocal();
      }
    } catch (e) {}
  }

  /* 카드 쓰기 */
  async function save(card) {
    if (!guard()) return false;
    card = norm(card);
    const i = cards.findIndex((c) => c.id === card.id);
    const old = i >= 0 ? cards[i] : null;
    if (prepare) card = prepare(old, card);
    const evs = diff(old, card);
    if (i >= 0) cards[i] = card;
    else cards.push(card);
    onChange();
    if (saved) saved(old, card, cards);
    if (mode === "db") {
      const data = { ...card };
      delete data.id;
      try {
        await queue(card.id, () => coll.doc(card.id).set(data));
      } catch (e) {
        fail(e);
        return true;
      }
    } else {
      persistLocal();
    }
    await logEvents(card.id, evs);
    return true;
  }

  async function removeMany(ids) {
    if (!guard() || !ids.length) return false;
    const set = new Set(ids);
    cards = cards.filter((c) => !set.has(c.id));
    onChange();
    if (mode === "db") {
      try {
        for (const id of ids) {
          await queue(id, () => coll.doc(id).delete());
          await purgeHistory(id);
        }
      } catch (e) {
        fail(e);
        return false;
      }
    } else {
      persistLocal();
      for (const id of ids) await purgeHistory(id);
    }
    return true;
  }

  // 가져오기: ups는 쓰거나 덮어쓸 카드, delIds는 지울 ID
  async function bulkApply(ups, delIds) {
    if (!guard()) return;
    const map = new Map(cards.map((c) => [c.id, c]));
    delIds.forEach((id) => map.delete(id));
    ups.forEach((c) => map.set(c.id, c));
    cards = Array.from(map.values());
    onChange();
    if (mode === "db") {
      toast("저장하는 중이에요…");
      try {
        for (const id of delIds) {
          await queue(id, () => coll.doc(id).delete());
          await purgeHistory(id);
        }
        for (const c of ups) {
          const d = { ...c };
          delete d.id;
          await queue(c.id, () => coll.doc(c.id).set(d));
        }
        toast("가져오기를 마쳤어요.");
      } catch (e) {
        fail(e);
      }
    } else {
      persistLocal();
      for (const id of delIds) await purgeHistory(id);
      toast("가져오기를 마쳤어요.");
    }
  }

  async function seed() {
    for (const c of sample()) await save(c);
  }

  /* 시작: db가 있으면 실시간 구독, 없으면 localStorage */
  async function init() {
    loadHistLocal();
    let db = null;
    try {
      db = await (window.claude && window.claude.use ? window.claude.use("db") : null);
    } catch (e) {
      db = null;
    }
    const toLocal = () => {
      mode = "local";
      try {
        const raw = localStorage.getItem(lsKey);
        cards = raw ? JSON.parse(raw).map(norm) : sample();
      } catch (e) {
        cards = sample();
      }
      onChange();
    };
    if (!db) {
      toLocal();
      return;
    }
    coll = db.collection("cards");
    hist = db.collection("history");
    coll.onSnapshot(
      (snap) => {
        if (snap.metadata && snap.metadata.fromCache && snap.empty) return;
        mode = "db";
        applySnap(snap);
      },
      () => toLocal()
    );
  }

  return {
    init,
    save,
    seed,
    removeMany,
    bulkApply,
    find,
    nextOrder,
    history: { fetch: fetchHistory },
    get cards() {
      return cards;
    },
    get mode() {
      return mode;
    },
  };
}
