import { useEffect, useState, type ComponentProps } from "react";

/*
 * v205: sonner (~34 KB) arrives just after the page is interactive instead of
 * inside the main bundle every visitor waits for. Same toasts, same look:
 * `toast` mirrors the two calls the store makes, and anything raised before
 * the Toaster is mounted waits and shows the moment it is - sonner itself
 * drops toasts raised while no Toaster is listening.
 */
type Sonner = typeof import("sonner");
type Kind = "success" | "error";
type Args = Parameters<Sonner["toast"]["success"]>;

let sonner: Sonner | null = null;
let loading: Promise<Sonner> | null = null;
let mounted = false;
const queue: [Kind, Args][] = [];

function loadSonner(): Promise<Sonner> {
  loading ??= import("sonner").then(
    (m) => (sonner = m),
    (err: unknown) => {
      loading = null; // try again on the next toast
      throw err;
    },
  );
  return loading;
}

function show(kind: Kind, args: Args) {
  // Nothing renders toasts on the server; don't let a queue build up there.
  if (typeof window === "undefined") return;
  if (sonner && mounted) {
    sonner.toast[kind](...args);
    return;
  }
  queue.push([kind, args]);
  void loadSonner().catch(() => {});
}

export const toast = {
  success: (...args: Args) => show("success", args),
  error: (...args: Args) => show("error", args),
};

/** Drop-in for sonner's <Toaster />, loaded after mount. */
export function Toaster(props: ComponentProps<Sonner["Toaster"]>) {
  const [Impl, setImpl] = useState<Sonner["Toaster"] | null>(() => sonner?.Toaster ?? null);
  useEffect(() => {
    let live = true;
    loadSonner().then(
      (m) => {
        if (live) setImpl(() => m.Toaster);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  // Runs after sonner's own effect has subscribed it to new toasts.
  useEffect(() => {
    if (!Impl || !sonner) return;
    mounted = true;
    for (const [kind, args] of queue.splice(0)) sonner.toast[kind](...args);
    return () => {
      mounted = false;
    };
  }, [Impl]);
  return Impl ? <Impl {...props} /> : null;
}
