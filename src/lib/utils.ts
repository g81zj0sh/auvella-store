import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* tailwind-merge has to know the store's own radius utilities (v156:
   rounded-control / rounded-card / rounded-pill, from src/styles.css), or a
   className like "rounded-control" passed to a component would sit beside
   its built-in "rounded-md" instead of replacing it. */
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ["control", "card", "pill"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
