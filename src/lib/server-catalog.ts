import {
  listLogos,
  syncCatalogFromSource,
  getCollectionCounts,
  getSourceCounts,
} from "@/lib/catalog";
import { getDatabase } from "@/lib/db";
import { getChannelConfig, type ChannelId } from "@/lib/channel";
import type { LogoCollection } from "@/lib/types";

/** 해당 채널 DB가 비어 있으면 카탈로그 동기화 */
export async function ensureCatalogSynced(
  channelId: ChannelId = "logos",
): Promise<void> {
  const database = getDatabase();
  const row = database
    .prepare("SELECT COUNT(*) as count FROM logos WHERE channel = ?")
    .get(channelId) as { count: number };

  if (row.count === 0) {
    await syncCatalogFromSource(channelId);
  }
}

export async function getHomePageData(
  searchParams: {
    q?: string;
    category?: string;
    tag?: string;
    collection?: string;
    source?: string;
    page?: string;
    sort?: string;
  },
  channelId: ChannelId = "logos",
  pageSize = 48,
) {
  await ensureCatalogSynced(channelId);
  const channel = getChannelConfig(channelId);

  const collection =
    channel.galleryGroupBy === "collection" &&
    (searchParams.collection === "simple" ||
      searchParams.collection === "themed")
      ? (searchParams.collection as LogoCollection)
      : undefined;

  const source =
    channel.galleryGroupBy === "source" && searchParams.source?.trim()
      ? searchParams.source.trim()
      : undefined;

  return listLogos({
    channel: channelId,
    query: searchParams.q,
    categorySlug: searchParams.category,
    tagSlug: searchParams.tag,
    collection,
    source,
    page: Number(searchParams.page ?? "1"),
    pageSize,
    sort: searchParams.sort === "recent" ? "recent" : "name",
  });
}

export function getCollectionCountsForHome(channelId: ChannelId = "logos") {
  return getCollectionCounts(channelId);
}

export function getPackageCountsForHome(channelId: ChannelId) {
  return getSourceCounts(channelId);
}
