/*
 * Landing-path capture.
 *
 * Records the very first path of the browsing session, once, at module-eval
 * time on the client. This must be imported from the root route rather than
 * from the component that reads it: route chunks are code-split, so a module
 * imported only by the home route would first evaluate when the visitor
 * *arrives* at the home page — by which point location.pathname reads "/" even
 * for someone who landed on a collection and clicked through. The root chunk is
 * always evaluated on the initial document load, so it sees the true entry URL.
 */

const LANDING_KEY = "auvella_landing_path_v1";

if (typeof window !== "undefined") {
  try {
    if (!sessionStorage.getItem(LANDING_KEY)) {
      sessionStorage.setItem(LANDING_KEY, window.location.pathname || "/");
    }
  } catch {
    /* storage unavailable — landedOnHome() falls back to permissive */
  }
}

/** True when this session's first page was the home page. */
export function landedOnHome(): boolean {
  if (typeof window === "undefined") return false;
  let p: string | null = null;
  try {
    p = sessionStorage.getItem(LANDING_KEY);
  } catch {
    return true; // no storage: behave as before rather than suppressing outright
  }
  if (!p) return true;
  return p === "/" || p === "";
}
