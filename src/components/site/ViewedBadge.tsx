import { useEffect, useState } from "react";

/*
 * v208: "🔥 1.4k people viewed this in the last 24 hours" over the product
 * photo (owner's ask, after Gymshark). The count is real - distinct visitors
 * of this product page in the last 24 hours (lib/productViewsApi) - and the
 * badge only shows from 1,000 up; below that it renders nothing.
 *
 * It loads after the page, absolutely positioned over the photo, so nothing
 * moves when it appears, and the server HTML never depends on it.
 */

export const VIEWED_MIN = 1000;

/** 1,435 -> "1.4k" (rounded down, so it never overstates); 12,300 -> "12k". */
export function formatViews(count: number): string {
  if (count >= 10_000) return `${Math.floor(count / 1000)}k`;
  return `${(Math.floor(count / 100) / 10).toFixed(1)}k`;
}

/** Counts this visit (real browsers only) and returns the 24-hour figure. */
export function useProductViews(handle: string): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    setCount(null);
    let live = true;
    // Automated browsers (tests, crawlers that run scripts) only read the count.
    const method = navigator.webdriver ? "GET" : "POST";
    fetch(`/api/views/${encodeURIComponent(handle)}`, { method, keepalive: true })
      .then((r) => (r.ok ? (r.json() as Promise<{ count?: number }>) : null))
      .then((body) => {
        if (live && typeof body?.count === "number") setCount(body.count);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [handle]);
  return count;
}

export function ViewedBadge({ count, className = "" }: { count: number | null; className?: string }) {
  if (count === null || count < VIEWED_MIN) return null;
  return (
    <p
      className={`pointer-events-none flex items-center gap-1.5 rounded-pill bg-white/95 px-3 py-1.5 text-[11px] leading-none text-[#555555] shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${className}`}
    >
      <span aria-hidden="true">🔥</span>
      <span>
        <span className="font-semibold text-[#0a0a0a]">{formatViews(count)}</span> people viewed this in the
        last 24 hours
      </span>
    </p>
  );
}
