/*
 * Eased in-page scroll to an element by id.
 *
 * A plain `href="#section"` jumps instantly, and native
 * `scrollIntoView({ behavior: "smooth" })` is browser-timed — iOS Safari
 * covers two screens in a few hundred ms, which still reads as a snap. This
 * runs a fixed ease-in-out over a duration scaled to the distance (~0.7–1.2s),
 * so the page glides down and settles.
 *
 *  - Honours the target's `scroll-margin-top`, so `scroll-mt-*` keeps the
 *    sticky header clear exactly as the old anchor jump did.
 *  - Re-reads the target every frame, so a late layout shift above it can't
 *    make it overshoot or stop short.
 *  - Hands control back the moment the visitor scrolls, swipes or presses a
 *    key themselves.
 *  - prefers-reduced-motion: jumps straight there.
 *
 * Returns false if the element isn't on the page, so callers can fall back to
 * the browser's default anchor behaviour.
 */
export function smoothScrollToId(id: string): boolean {
  if (typeof window === "undefined") return false;
  const el = document.getElementById(id);
  if (!el) return false;

  const targetY = () => {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY - margin);
  };

  const startY = window.scrollY;
  const distance = Math.abs(targetY() - startY);
  if (distance < 2) return true;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetY());
    return true;
  }

  const duration = Math.min(1200, Math.max(700, distance * 0.5));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);

  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, startY + (targetY() - startY) * ease(p));
    if (p < 1) raf = requestAnimationFrame(step);
    else stop();
  };
  raf = requestAnimationFrame(step);
  return true;
}
