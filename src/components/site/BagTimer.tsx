import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";

const DURATION = 10 * 60; // seconds
const KEY = "auvella_bag_timer_start";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function readStart(): number | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeStart(v: number | null) {
  try {
    if (v === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, String(v));
  } catch {
    // Storage blocked (e.g. private mode): the timer still runs, it just won't carry over.
  }
}

/* The clock starts as soon as something goes in the bag - not when the bag
   is opened - and keeps running across page changes and reopening the bag
   (it's kept in sessionStorage for this browser tab). Emptying the bag clears
   it, so the next bag starts again from 10:00. */
if (typeof window !== "undefined") {
  let prev = useCartStore.getState().items.length;
  if (prev > 0 && readStart() === null) writeStart(Date.now());
  useCartStore.subscribe((s) => {
    const n = s.items.length;
    if (n > 0 && readStart() === null) writeStart(Date.now());
    if (n === 0 && prev > 0) writeStart(null);
    prev = n;
  });
}

function secondsLeft() {
  const start = readStart() ?? Date.now();
  const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
  return DURATION - (elapsed % (DURATION + 1));
}

/* Counts 10:00 down to 00:00, then starts again at 10:00. */
export function BagTimer() {
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    if (readStart() === null) writeStart(Date.now());
    setLeft(secondsLeft());
    const id = setInterval(() => setLeft(secondsLeft()), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      role="timer"
      className="mx-auto mt-4 w-[calc((100%-3rem)*0.8)] rounded-control border border-[#94E374] bg-[#DCFFD3] px-4 py-[9px] text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-[#166534]"
    >
      YOUR ORDER IS RESERVED FOR {" "}
      <span className="inline-block w-[5ch] text-left tabular-nums">{fmt(left)}</span>
    </div>
  );
}
