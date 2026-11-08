// 드래그 앤 드롭. 포인터 이벤트라 마우스와 터치에서 같이 동작한다.
// 마우스는 6px 이상 움직이면 시작하고, 터치는 0.23초 길게 눌러야 시작한다.
export function attachDrag({ board, getCard, onDrop, onEnd }) {
  const line = document.createElement("div");
  line.className = "drop-line";
  let drag = null;
  let pending = null;
  let suppress = false;

  const isMobile = () => window.innerWidth <= 720;

  function start(p, x, y) {
    clearTimeout(p.timer);
    pending = null;
    const r = p.el.getBoundingClientRect();
    const ghost = p.el.cloneNode(true);
    ghost.className = "card ghost";
    ghost.removeAttribute("tabindex");
    ghost.style.width = r.width + "px";
    document.body.appendChild(ghost);
    p.el.classList.add("is-dragging");
    document.body.classList.add("dragging");
    drag = { id: p.id, el: p.el, ghost, offX: x - r.left, offY: y - r.top, x, y, colEl: p.el.closest(".col"), idx: 0, list: [], last: null };
    if (navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch (e) {}
    }
    move(x, y);
    requestAnimationFrame(loop);
  }

  function move(x, y) {
    drag.x = x;
    drag.y = y;
    drag.ghost.style.transform = "translate(" + (x - drag.offX) + "px," + (y - drag.offY) + "px) rotate(1.6deg)";
    updateTarget();
  }

  function updateTarget() {
    const el = document.elementFromPoint(drag.x, drag.y);
    let colEl = el ? el.closest(".col") : null;
    if (!colEl) colEl = drag.colEl;
    if (!colEl) return;
    const body = colEl.querySelector(".col-b");
    const list = Array.prototype.filter.call(body.querySelectorAll(".card"), (c) => c !== drag.el);
    let idx = 0;
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      if (drag.y > r.top + r.height / 2) idx++;
      else break;
    }
    drag.colEl = colEl;
    drag.idx = idx;
    drag.list = list;
    if (drag.last !== colEl) {
      if (drag.last) drag.last.classList.remove("drop-target");
      colEl.classList.add("drop-target");
      drag.last = colEl;
    }
    body.insertBefore(line, list[idx] || null);
  }

  // 가장자리에 가져가면 보드와 페이지를 자동으로 스크롤한다.
  function loop() {
    if (!drag) return;
    const r = board.getBoundingClientRect();
    const m = isMobile();
    const edge = m ? 64 : 48;
    const topEdge = m ? 112 : 72;
    const stepX = m ? 16 : 12;
    let dx = 0;
    let dy = 0;
    if (drag.x < r.left + edge) dx = -stepX;
    else if (drag.x > r.right - edge) dx = stepX;
    if (drag.y < topEdge) dy = -14;
    else if (drag.y > window.innerHeight - 72) dy = 14;
    if (dx) board.scrollLeft += dx;
    if (dy) window.scrollBy(0, dy);
    if (dx || dy) updateTarget();
    requestAnimationFrame(loop);
  }

  function finish(commit) {
    const d = drag;
    drag = null;
    d.ghost.remove();
    d.el.classList.remove("is-dragging");
    document.body.classList.remove("dragging");
    line.remove();
    if (d.last) d.last.classList.remove("drop-target");
    suppress = true;
    setTimeout(() => {
      suppress = false;
    }, 60);
    if (commit && d.colEl) {
      const prev = d.list[d.idx - 1];
      const next = d.list[d.idx];
      const po = prev ? orderOf(prev.dataset.id) : null;
      const no = next ? orderOf(next.dataset.id) : null;
      const card = getCard(d.id);
      const col = d.colEl.dataset.col;
      if (card) {
        const same = col === card.col && (po == null || po < card.order) && (no == null || no > card.order);
        if (!same) {
          // 앞뒤 카드의 order 사이로 끼워 넣는다.
          const order = po != null && no != null ? (po + no) / 2 : po != null ? po + 1 : no != null ? no - 1 : 1;
          onDrop(card, col, order);
          return;
        }
      }
    }
    onEnd();
  }

  function orderOf(id) {
    const c = getCard(id);
    return c ? c.order : null;
  }

  function release(commit) {
    if (pending) {
      clearTimeout(pending.timer);
      pending = null;
    }
    if (drag) finish(commit);
  }

  board.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const el = e.target.closest(".card");
    if (!el || e.target.closest("button,input,a")) return;
    const p = { id: el.dataset.id, el, x: e.clientX, y: e.clientY, touch: e.pointerType !== "mouse", timer: null };
    pending = p;
    if (p.touch) {
      p.timer = setTimeout(() => {
        if (pending === p) start(p, p.x, p.y);
      }, 230);
    }
  });
  document.addEventListener("pointermove", (e) => {
    if (drag) {
      move(e.clientX, e.clientY);
      return;
    }
    if (pending) {
      const dx = e.clientX - pending.x;
      const dy = e.clientY - pending.y;
      if (Math.hypot(dx, dy) > 6) {
        if (pending.touch) {
          clearTimeout(pending.timer);
          pending = null;
        } else {
          start(pending, e.clientX, e.clientY);
        }
      }
    }
  });
  document.addEventListener("pointerup", () => release(true));
  document.addEventListener("pointercancel", () => release(false));
  document.addEventListener("touchmove", (e) => { if (drag) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drag) release(false); });
  board.addEventListener("contextmenu", (e) => { if (e.target.closest(".card")) e.preventDefault(); });

  return {
    get active() {
      return drag !== null;
    },
    get suppressClick() {
      return suppress;
    },
  };
}
