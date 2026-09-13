/*
 * EditorialImage — the single source of truth for all editorial/collection
 * imagery. Every tile, panel, banner, UGC square and product card image
 * renders through this so crop behaviour is identical everywhere.
 *
 * Rules enforced here:
 *  - fills its container: absolute inset-0, width/height 100%, display block
 *  - object-fit: cover always; natural image dimensions never drive layout
 *  - crop anchor defaults to `center top`; override per image via `position`
 *  - `zoom` = standard 12% base scale (crops baked-in film borders uniformly)
 *  - `scale` = per-image art direction override (e.g. 1.4). transform-origin
 *    follows `position`, so scaling zooms toward the crop anchor / subject.
 *  - hover zoom (+4% of base) lives on the image only; parent must be
 *    `group` with overflow-hidden
 *  - srcset/sizes: the CDN serves a correctly-sized render of the untouched
 *    master, so a multi-MB PNG no longer ships whole to a small tile. Widths
 *    run to 2x the painted size, so retina screens lose nothing.
 */
import { shopifyImg, shopifySrcSet } from "@/lib/shopify";
export function EditorialImage({
  src,
  alt = "",
  position = "center top",
  zoom = false,
  scale,
  hover = true,
  eager = false,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw",
  maxWidth = 1200,
}: {
  src: string;
  alt?: string;
  position?: string;
  zoom?: boolean;
  /** Art-direction zoom for this specific image, e.g. 1.4. Overrides `zoom`. */
  scale?: number;
  hover?: boolean;
  eager?: boolean;
  /** CSS width this image paints at, so the browser picks the right source. */
  sizes?: string;
  /** Largest candidate offered; caps the srcset for small tiles. */
  maxWidth?: number;
}) {
  const base = scale ?? (zoom ? 1.12 : 1);
  void hover;
  return (
    <img
      src={shopifyImg(src, Math.min(maxWidth, 1200))}
      srcSet={shopifySrcSet(src, maxWidth)}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      draggable={false}
      style={
        {
          objectPosition: position,
          transformOrigin: position,
          "--ei-s": String(base),
        } as React.CSSProperties
      }
      className="absolute inset-0 block h-full w-full object-cover scale-[var(--ei-s)]"
    />
  );
}
