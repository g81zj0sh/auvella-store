import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { addedToBagText } from "@/lib/freeDelivery";
import { useDisplayPrice } from "@/lib/preferences";
import { fetchProductsByHandles, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { ADD_ON_HANDLES, isAddOn } from "@/lib/addOns";

/*
 * "Complete the look" (v238, the ads chat's brief of 23 Nov 2026): the two
 * add-ons, live in Shopify - the Stick-On Push-Up Bra (£9.99, Nude/Black,
 * A-D cup) and Lift Tape (£8.99 5cm / £9.99 7.5cm, Tan/Light Beige/Black;
 * Light Beige 5cm only) - as small cards with their own colour and size
 * pickers and an Add button:
 *   - on every bodysuit page, under Add to Bag;
 *   - in the bag while it holds a bodysuit and no add-on. With one bodysuit
 *     and nothing else the heading says the add makes delivery free - true:
 *     add-ons count towards free delivery on 2+ items (lib/freeDelivery and
 *     Shopify's FREE-DELIVERY-2PLUS code both count any item but underwear).
 * Prices are the live ones in the shopper's currency; nothing is struck
 * through (the add-ons have no compare-at). Lines added here carry the
 * hidden attribute _upsell = complete-the-look-page / -bag.
 */

export { ADD_ON_HANDLES, isAddOn };

type Variant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];

const has = (v: Variant, name: string, value: string) =>
  v.selectedOptions.some((o) => o.name === name && o.value === value);

export function AddOnRow({
  heading,
  place,
  onNavigate,
}: {
  heading: string;
  /** Where the row is: the product page or the bag (for the line attribute). */
  place: "page" | "bag";
  /** The bag closes itself when a card's link is followed. */
  onNavigate?: () => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["add-ons"],
    queryFn: () => fetchProductsByHandles([...ADD_ON_HANDLES]),
    staleTime: 5 * 60_000,
  });
  const products = (data ?? []).filter((p) => isAddOn(p.node.handle));
  // While loading, the same space as the cards (no jump under the button).
  if (!isPending && products.length === 0) return null;
  return (
    <section aria-label={heading}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0a0a0a]">{heading}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {isPending
          ? ADD_ON_HANDLES.map((h) => <CardSkeleton key={h} />)
          : products.map((p) => <AddOnCard key={p.node.id} product={p} place={place} onNavigate={onNavigate} />)}
      </div>
    </section>
  );
}

function CardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col rounded-card border border-[#EBEBEB] p-2.5">
      <div className="aspect-square w-full rounded-[6px] bg-[#f2f1ef]" />
      <div className="mt-2 h-[34px] rounded bg-[#f2f1ef]" />
      <div className="mt-1.5 h-[16px] w-1/3 rounded bg-[#f2f1ef]" />
      <div className="mt-2 h-8 rounded-control bg-[#f2f1ef]" />
      <div className="mt-1.5 h-8 rounded-control bg-[#f2f1ef]" />
      <div className="mt-2 h-9 rounded-control bg-[#f2f1ef]" />
    </div>
  );
}

function AddOnCard({
  product,
  place,
  onNavigate,
}: {
  product: ShopifyProduct;
  place: "page" | "bag";
  onNavigate?: () => void;
}) {
  const n = product.node;
  const variants = n.variants.edges.map((e) => e.node);
  const colourOpt = n.options.find((o) => /colou?r/i.test(o.name));
  const sizeOpt = n.options.find((o) => o !== colourOpt && o.values.length > 1);
  const firstColour = colourOpt
    ? (colourOpt.values.find((c) => variants.some((v) => v.availableForSale && has(v, colourOpt.name, c))) ??
      colourOpt.values[0])
    : undefined;
  const [colour, setColour] = useState<string | undefined>(firstColour);
  const [size, setSize] = useState("");
  const [needSize, setNeedSize] = useState(false);
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const sizeRef = useRef<HTMLSelectElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const display = useDisplayPrice();

  const forColour = variants.filter((v) => !colourOpt || !colour || has(v, colourOpt.name, colour));
  const variant = sizeOpt ? (size ? forColour.find((v) => has(v, sizeOpt.name, size)) : undefined) : forColour[0];

  // The size's state in this colour: on sale, sold out, or not made.
  const sizeState = (value: string): "ok" | "sold out" | "missing" => {
    const v = forColour.find((x) => sizeOpt && has(x, sizeOpt.name, value));
    return !v ? "missing" : v.availableForSale ? "ok" : "sold out";
  };
  const prices = forColour.map((v) => parseFloat(v.price.amount));
  const pricesDiffer = prices.length > 1 && Math.max(...prices) > Math.min(...prices);
  const currency = forColour[0]?.price.currencyCode ?? "GBP";
  const priceText = variant
    ? display(variant.price.amount, variant.price.currencyCode)
    : prices.length
      ? `${pricesDiffer ? "From " : ""}${display(Math.min(...prices), currency)}`
      : "";

  // This colour's picture: its variant photo, else the first one named after it.
  const shown = variant ?? forColour[0];
  const image =
    shown?.image?.url ??
    (colour
      ? n.images.edges.find((e) => (e.node.altText ?? "").toLowerCase().includes(`in ${colour.toLowerCase()}`))?.node.url
      : undefined) ??
    n.images.edges[0]?.node.url;
  const imageAlt = `${n.title}${colour ? ` in ${colour}` : ""}`;

  const sizeWord = sizeOpt
    ? sizeOpt.values.every((v) => /cup$/i.test(v))
      ? "cup size"
      : sizeOpt.values.every((v) => /wide$/i.test(v))
        ? "width"
        : "size"
    : "";

  const pickColour = (c: string) => {
    setColour(c);
    // A size this colour doesn't come in is cleared (Light Beige is 5cm only).
    if (size && sizeOpt && !variants.some((v) => has(v, sizeOpt.name, size) && (!colourOpt || has(v, colourOpt.name, c)))) {
      setSize("");
    }
  };

  const onAdd = async () => {
    if (state === "adding") return;
    if (sizeOpt && !size) {
      setNeedSize(true);
      sizeRef.current?.focus();
      return;
    }
    if (!variant || !variant.availableForSale) return;
    setState("adding");
    try {
      const ok = await addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions,
        attributes: [{ key: "_upsell", value: `complete-the-look-${place}` }],
      });
      if (ok) {
        toast.success(addedToBagText(useCartStore.getState()), { position: "top-center" });
        setState("added");
        window.setTimeout(() => setState("idle"), 2000);
      } else {
        toast.error("We couldn't add that. Please try again.", { position: "top-center" });
        setState("idle");
      }
    } catch {
      toast.error("We couldn't add that. Please try again.", { position: "top-center" });
      setState("idle");
    }
  };

  const select =
    "h-8 w-full rounded-control border border-[#cfcfcf] bg-white px-2 text-[12px] text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a0a0a]";

  return (
    <div className="flex flex-col rounded-card border border-[#EBEBEB] bg-white p-2.5">
      <Link
        to="/product/$handle"
        params={{ handle: n.handle }}
        onClick={onNavigate}
        className="block aspect-square w-full overflow-hidden rounded-[6px] bg-[#f6f5f3]"
      >
        {image && (
          <img
            src={shopifyImg(image, 400)}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </Link>
      <Link
        to="/product/$handle"
        params={{ handle: n.handle }}
        onClick={onNavigate}
        className="mt-2 line-clamp-2 min-h-[34px] font-serif text-[13px] leading-[17px] text-[#0a0a0a] hover:underline"
      >
        {n.title}
      </Link>
      <p className="mt-1 text-[12px] leading-4 text-[#0a0a0a]">{priceText}</p>
      {colourOpt && colourOpt.values.length > 1 && (
        <select
          aria-label={`Colour for ${n.title}`}
          value={colour ?? ""}
          onChange={(e) => pickColour(e.target.value)}
          className={`mt-2 ${select}`}
        >
          {colourOpt.values.map((c) => {
            const ok = variants.some((v) => v.availableForSale && has(v, colourOpt.name, c));
            return (
              <option key={c} value={c} disabled={!ok}>
                {ok ? c : `${c} — sold out`}
              </option>
            );
          })}
        </select>
      )}
      {sizeOpt && (
        <select
          ref={sizeRef}
          aria-label={`${sizeWord.charAt(0).toUpperCase()}${sizeWord.slice(1)} for ${n.title}`}
          aria-invalid={needSize && !size}
          value={size}
          onChange={(e) => {
            setSize(e.target.value);
            setNeedSize(false);
          }}
          className={`mt-1.5 ${select} ${needSize && !size ? "border-[#b00020]" : ""}`}
        >
          <option value="" disabled>
            {`Choose ${sizeWord}`}
          </option>
          {sizeOpt.values.map((value) => {
            const st = sizeState(value);
            const v = forColour.find((x) => has(x, sizeOpt.name, value));
            const price = pricesDiffer && v ? ` · ${display(v.price.amount, v.price.currencyCode)}` : "";
            return (
              <option key={value} value={value} disabled={st !== "ok"}>
                {st === "ok" ? `${value}${price}` : st === "sold out" ? `${value} — sold out` : `${value} — not in ${colour}`}
              </option>
            );
          })}
        </select>
      )}
      {needSize && !size && (
        <p role="alert" className="mt-1 text-[11px] text-[#b00020]">
          Choose a {sizeWord}
        </p>
      )}
      <button
        type="button"
        onClick={onAdd}
        disabled={state === "adding" || (!!variant && !variant.availableForSale)}
        aria-label={`Add ${n.title} to bag`}
        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-control border border-[#0a0a0a] text-[11px] font-medium uppercase tracking-[0.16em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:opacity-50"
      >
        {state === "adding" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : state === "added" ? (
          <>
            <Check className="h-3.5 w-3.5" /> Added
          </>
        ) : (
          "Add"
        )}
      </button>
    </div>
  );
}
