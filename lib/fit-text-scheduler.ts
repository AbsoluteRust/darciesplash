// lib/fit-text-scheduler.ts

type Pending = {
  el: HTMLElement;
  minFontSize: number;
  onResult: (size: number) => void;
};

const queue: Pending[] = [];
let scheduled = false;

function flush() {
  scheduled = false;
  const items = queue.splice(0, queue.length);
  if (items.length === 0) return;

  // -------- Write phase 1: reset all to natural size --------
  for (const item of items) {
    item.el.style.fontSize = '';
  }

  // -------- Read phase: batch all measurements --------
  // Because we just wrote, the first read will flush one recalc + one layout,
  // and all subsequent reads are served from the same computed layout.
  // Net cost: 2 forced syncs for the whole batch, not 2 per card.
  const reads = items.map(item => ({
    item,
    natural: parseFloat(getComputedStyle(item.el).fontSize) || 0,
    available: item.el.clientWidth,
    scroll: item.el.scrollWidth,
  }));

  // -------- Compute phase: pure math, no layout --------
  const results = reads.map(({ item, natural, available, scroll }) => {
    if (!natural || !available || scroll <= available) {
      return { item, size: natural };
    }
    // Ratio approximation: shrunk font-size is roughly linear with width.
    // Within ~1px of the exact binary-search result for normal text.
    const ratio = available / scroll;
    const approx = Math.max(item.minFontSize, Math.floor(natural * ratio * 0.985));
    return { item, size: approx };
  });

  // -------- Write phase 2: apply all sizes at once --------
  for (const { item, size } of results) {
    if (size > 0) item.el.style.fontSize = `${size}px`;
  }
}

export function scheduleFit(el: HTMLElement, minFontSize: number, onResult: (size: number) => void) {
  queue.push({ el, minFontSize, onResult });
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(flush);
}