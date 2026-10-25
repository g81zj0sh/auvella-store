import { createServerFn } from "@tanstack/react-start";
import { FULL_CATALOG_TABLES } from "./catalogTablesFull";

/*
 * v206: the full catalogue tables from the Worker, for when the browser could
 * not download their chunk (lib/catalogTables). Browsers remember a failed
 * module download for the life of the page, so importing the chunk again
 * fails straight away; this is a different URL. Read-only data that is
 * already public in the site's own JavaScript.
 */
export const fetchCatalogTables = createServerFn({ method: "GET" }).handler(async () => FULL_CATALOG_TABLES);
