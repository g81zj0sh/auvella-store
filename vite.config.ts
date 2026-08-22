import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

/*
 * Replaces the Lovable-managed @lovable.dev/vite-tanstack-config wrapper.
 * That package configures nitro's Cloudflare preset internally with no way
 * to override it, so it's dropped here for a preset we control directly:
 * "cloudflare-module" — the Workers (not Pages) build target, matching the
 * `wrangler.jsonc` Worker deploy at the repo root.
 */
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    nitro({ preset: "cloudflare-module" }),
  ],
});
