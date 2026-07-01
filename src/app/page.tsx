import { LogoCard } from "@/components/LogoCard";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterPanel } from "@/components/FilterPanel";
import { GalleryPagination } from "@/components/GalleryPagination";
import { GalleryToolbar } from "@/components/GalleryToolbar";
import { listCategories, listTags } from "@/lib/catalog";
import { getCollectionCountsForHome, getHomePageData } from "@/lib/server-catalog";
import type { LogoCollection } from "@/lib/types";

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    collection?: string;
    page?: string;
    sort?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const activeCollection =
    params.collection === "simple" || params.collection === "themed"
      ? (params.collection as LogoCollection)
      : undefined;

  const [result, categories, tags, collectionCounts] = await Promise.all([
    getHomePageData(params),
    Promise.resolve(listCategories()),
    Promise.resolve(listTags()),
    Promise.resolve(getCollectionCountsForHome()),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <section className="mb-8 text-center md:mb-12">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
          SVG LOGOS
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted md:text-base">
          Vector logos for developers, designers, and teams.
          <br className="hidden sm:inline" />
          {result.total.toLocaleString()} curated SVGs via Statically CDN.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <FilterPanel
          categories={categories}
          tags={tags}
          activeCategory={params.category}
          activeTag={params.tag}
          activeCollection={activeCollection}
          query={params.q}
        />

        <div>
          <CollectionTabs
            activeCollection={activeCollection}
            counts={collectionCounts}
            searchParams={params}
          />

          <GalleryToolbar
            total={result.total}
            page={result.page}
            totalPages={totalPages}
            sort={params.sort}
            searchParams={params}
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((logo) => (
              <LogoCard key={logo.shortname} logo={logo} />
            ))}
          </div>

          {result.items.length === 0 && (
            <div className="py-20 text-center text-muted">No logos found.</div>
          )}

          <GalleryPagination
            page={result.page}
            totalPages={totalPages}
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
