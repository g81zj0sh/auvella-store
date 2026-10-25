import { useEffect, useSyncExternalStore } from "react";
import { GALLERY_INDEX, type GalleryEntry } from "@/lib/galleryIndex";
import { addBackdrops, backdropEntries, type Backdrop } from "@/lib/imageBackdrop";
import { addCharts, rawChart, type ProductChart } from "@/lib/productSizeCharts";
import { fetchCatalogTables } from "@/lib/catalogTables.functions";

/*
 * v205: the catalogue lookup tables - gallery colourways (galleryIndexData),
 * image backdrops (imageBackdrops) and size charts (productSizeChartsData) -
 * are ~240 KB of data, ~70 KB over the wire, and every phone downloaded all
 * of it before a product page would respond to a tap. A page only needs its
 * own product's rows to render, so:
 *
 *  - the server holds the full tables (server.ts installs catalogTablesFull);
 *  - a product page's loader puts that product's rows in the page
 *    (catalogSeedFor) and the page seeds them before it renders, so the
 *    browser's first render matches the server's exactly;
 *  - the full tables load once the page is interactive (useCatalogTables in
 *    the bag button, which every page has), and whatever shows OTHER products
 *    - the rail, the bag, quick add, the bundle mixer - waits for them or
 *    re-renders when they land;
 *  - v206: if their chunk can't be downloaded, the same tables come from the
 *    Worker instead (catalogTables.functions), and failed tries are retried,
 *    so a dropped request on a poor signal can't leave a page without them;
 *  - pages built from product tiles (home, collections, favourites, account)
 *    get the full tables with ProductCard, before they render.
 */

export type CatalogTables = {
  gallery: Record<string, Record<string, GalleryEntry>>;
  backdrops: Record<string, Backdrop>;
  charts: Record<string, ProductChart>;
};

let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Every row, from lib/catalogTablesFull. Safe to call more than once. */
export function installCatalogTables(tables: CatalogTables): void {
  Object.assign(GALLERY_INDEX, tables.gallery);
  addBackdrops(tables.backdrops);
  addCharts(tables.charts);
  loaded = true;
  listeners.forEach((l) => l());
}

export function catalogTablesLoaded(): boolean {
  return loaded;
}

/** The full tables, fetched once (again after a failed try). Instant where they are already in. */
export function loadCatalogTables(): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= import("@/lib/catalogTablesFull")
    .then((m) => m.FULL_CATALOG_TABLES)
    // A browser remembers a failed chunk download for the life of the page,
    // so asking for the chunk again can't work: ask the Worker instead.
    .catch(() => fetchCatalogTables())
    .then(installCatalogTables, (err: unknown) => {
      loading = null;
      throw err;
    });
  return loading;
}

let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryOnline = false;

/** Loads the full tables in the background, retrying a few times (and when the signal comes back). */
function loadInBackground(): void {
  if (loaded || retryTimer) return;
  loadCatalogTables().catch(() => {
    if (!retryOnline) {
      retryOnline = true;
      window.addEventListener("online", () => {
        retries = 0;
        loadInBackground();
      });
    }
    if (retries >= 4) return;
    retries += 1;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      loadInBackground();
    }, 4000 * retries);
  });
}

/** One product's rows, for its page (runs where the full tables are in). */
export function catalogSeedFor(handle: string, product: unknown): CatalogTables {
  const entry = GALLERY_INDEX[handle];
  const files = new Set<string>();
  for (const colour of Object.values(entry ?? {})) {
    for (const f of [...colour.m, ...colour.g]) files.add(f);
    if (colour.sw) files.add(colour.sw.f);
  }
  // Every image and video the page can show comes from the product data.
  for (const url of JSON.stringify(product ?? null).match(/https?:\/\/[^"]+/g) ?? []) files.add(url);
  const chart = rawChart(handle);
  return {
    gallery: entry ? { [handle]: entry } : {},
    backdrops: backdropEntries(files),
    charts: chart ? { [handle]: chart } : {},
  };
}

/** Puts a page's rows in place before it renders. No-op once the full tables are in. */
export function seedCatalog(seed: CatalogTables | undefined): void {
  if (!seed || loaded) return;
  Object.assign(GALLERY_INDEX, seed.gallery);
  addBackdrops(seed.backdrops);
  addCharts(seed.charts);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * True once the full tables are in; starts loading them when the browser is
 * next idle after mount. Components that show other products' rows call it
 * so they render with the tables, or again when they arrive. False during
 * the server render and hydration, so both renders agree.
 */
export function useCatalogTables(): boolean {
  const ready = useSyncExternalStore(subscribe, () => loaded, () => false);
  useEffect(() => {
    if (loaded) return;
    const start = loadInBackground;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 1000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(start, 200);
    return () => clearTimeout(t);
  }, []);
  return ready;
}
