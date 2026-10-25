import { GALLERY_DATA } from "@/lib/galleryIndexData";
import { BACKDROPS } from "@/lib/imageBackdrops";
import { PRODUCT_SIZE_CHARTS } from "@/lib/productSizeChartsData";
import type { CatalogTables } from "@/lib/catalogTables";
import type { ProductChart } from "@/lib/productSizeCharts";

/*
 * v205: every catalogue table row (see lib/catalogTables). Installed with
 * installCatalogTables by the server at start-up and by ProductCard and
 * QuickAddSheet, so tile pages have it before they render; everything else
 * loads it once the page is interactive. An explicit call rather than an
 * import for effect: package.json declares the code free of side effects,
 * so a bare `import "..."` can be dropped from the bundle.
 */
export const FULL_CATALOG_TABLES: CatalogTables = {
  gallery: GALLERY_DATA,
  backdrops: BACKDROPS,
  charts: PRODUCT_SIZE_CHARTS as Record<string, ProductChart>,
};
