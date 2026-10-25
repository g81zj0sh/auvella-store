import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { pageAlias } from "@/lib/legacyRedirects";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PAGES } from "@/lib/policyPages";

/* Store information & policy pages. Content: lib/policyPages.tsx (v205). */

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    // Old Shopify slugs (shipping-policy, faqs...): server.ts redirects them
    // on a fresh load; this covers client-side navigation (v186).
    const alias = pageAlias(params.slug);
    if (alias) throw redirect({ href: alias, statusCode: 301 });
    // v205: lazily, so the pages' text stays out of the main bundle.
    const { pageFor } = await import("@/lib/policyPages");
    const page = pageFor(params.slug);
    if (!page) throw notFound();
    return { slug: params.slug, title: page.title, description: page.description };
  },
  /* v188: every page was titled plain "Auvella" in tabs and search results. */
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const page = loaderData;
    // "About Auvella" already carries the name.
    const title = page.title.includes("Auvella") ? page.title : `${page.title} — Auvella`;
    const url = `https://auvellawear.com/pages/${loaderData.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: page.description },
        { property: "og:title", content: title },
        { property: "og:description", content: page.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PolicyPage,
});

function PolicyPage() {
  const { slug } = Route.useLoaderData();
  const page = PAGES[slug];
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-2xl pb-24 pt-32 md:pt-40">
        <h1 className="font-serif text-3xl font-light text-[#0a0a0a] md:text-4xl">
          {page.title}
        </h1>
        <div className="mt-2 h-px w-12 bg-[#0a0a0a]/20" />
        {page.body}
      </main>
      <Footer />
    </div>
  );
}
