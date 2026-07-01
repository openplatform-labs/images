import { listLogos, syncCatalogFromSource, getCollectionCounts } from "@/lib/catalog";
import { getDatabase } from "@/lib/db";
import type { LogoCollection } from "@/lib/types";

/** DB가 비어 있으면 GitHub에서 최초 동기화 */
export async function ensureCatalogSynced(): Promise<void> {
  const database = getDatabase();
  const row = database
    .prepare("SELECT COUNT(*) as count FROM logos")
    .get() as { count: number };

  if (row.count === 0) {
    await syncCatalogFromSource();
  }
}

export async function getHomePageData(searchParams: {
  q?: string;
  category?: string;
  tag?: string;
  collection?: string;
  page?: string;
  sort?: string;
}) {
  await ensureCatalogSynced();

  const collection =
    searchParams.collection === "simple" || searchParams.collection === "themed"
      ? (searchParams.collection as LogoCollection)
      : undefined;

  return listLogos({
    query: searchParams.q,
    categorySlug: searchParams.category,
    tagSlug: searchParams.tag,
    collection,
    page: Number(searchParams.page ?? "1"),
    sort: searchParams.sort === "recent" ? "recent" : "name",
  });
}

export function getCollectionCountsForHome() {
  return getCollectionCounts();
}
