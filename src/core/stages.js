// 모바일 단계 탭. 탭을 누르면 해당 열로 이동하고, 스와이프하면 현재 열이 탭에 표시된다.
export function attachStages({ board, stages, columns, count }) {
  let raf = 0;

  function render() {
    stages.innerHTML = columns
      .map((col) => `<button type="button" data-go="${col.id}" aria-current="false">${col.name} <span>${count(col)}</span></button>`)
      .join("");
  }

  function sync() {
    const cols = board.children;
    const bl = board.getBoundingClientRect().left;
    let best = 0;
    let bd = 1e9;
    for (let i = 0; i < cols.length; i++) {
      const d = Math.abs(cols[i].getBoundingClientRect().left - bl);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (board.scrollLeft + board.clientWidth >= board.scrollWidth - 4) best = cols.length - 1;
    const btns = stages.children;
    for (let j = 0; j < btns.length; j++) {
      const on = j === best;
      btns[j].setAttribute("aria-current", String(on));
      if (on && board.clientWidth < board.scrollWidth) {
        const l = btns[j].offsetLeft - 12;
        if (Math.abs(stages.scrollLeft - l) > 40) stages.scrollLeft = l;
      }
    }
  }

  stages.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    const col = board.querySelector('[data-col="' + b.dataset.go + '"]');
    if (!col) return;
    const left = col.getBoundingClientRect().left - board.getBoundingClientRect().left + board.scrollLeft - (parseFloat(getComputedStyle(board).paddingLeft) || 0);
    const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    board.scrollTo({ left, behavior: calm ? "auto" : "smooth" });
  });
  board.addEventListener(
    "scroll",
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", sync);

  return { render, sync };
}
