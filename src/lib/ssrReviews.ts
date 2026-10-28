import { createIsomorphicFn } from "@tanstack/react-start";
import { peekReviews } from "@/lib/reviewsServer";

/*
 * v210: the reviews a product page renders with. On the server: what
 * server.ts primed for this product (lib/reviewsServer), so the page arrives
 * with its stars and reviews. In the browser (a visit from another page): null,
 * and the page asks /api/reviews/<handle> instead. The server half and its
 * import are compiled out of the browser bundle.
 */
export const ssrReviews = createIsomorphicFn()
  .server((handle: string) => peekReviews(handle))
  .client((_handle: string) => null);
