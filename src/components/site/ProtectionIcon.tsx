import { shopifyImg } from "@/lib/shopify";
import { PROTECTION } from "@/lib/perks";

/*
 * The shipping protection's own logo (the product's image in Shopify), made
 * legible at small sizes. The file is a pale beige outline on white with wide
 * margins, which vanished at 20-36px, so it is cropped to the mark and its
 * tones remapped with plain CSS filters: grey, then brightness x contrast
 * work out to "levels" (out = 5.5 x in - 4.445), which keeps the white
 * ground white and takes the beige lines to a dark neutral. Same drawing,
 * just inked.
 */
const INK = "grayscale(1) brightness(0.556) contrast(9.89)";

export function ProtectionIcon({ size, className = "" }: { size: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 overflow-hidden bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={shopifyImg(PROTECTION.image, Math.max(160, size * 8))}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full scale-[1.3] object-cover"
        style={{ filter: INK }}
      />
    </span>
  );
}
