import { useEffect, useState } from "react";

const DURATION = 10 * 60; // seconds

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/* Counts 10:00 down to 00:00, then starts again at 10:00.
   Restarts from 10:00 each time the bag is opened. */
export function BagTimer() {
  const [left, setLeft] = useState(DURATION);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setLeft(DURATION - (elapsed % (DURATION + 1)));
    }, 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      role="timer"
      className="mx-auto mt-4 w-[calc((100%-3rem)*0.8)] rounded-control border border-[#94E374] bg-[#DCFFD3] px-4 py-[9px] text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-[#166534]"
    >
      YOUR ORDER IS RESERVED FOR  <span className="tabular-nums">{fmt(left)}</span>
    </div>
  );
}
