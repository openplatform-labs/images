import {
  listLogos,
  syncCatalogFromSource,
  getCollectionCounts,
  getSourceCounts,
} from "@/lib/catalog";
import { getDatabase } from "@/lib/db";
import {
  channelIds,
  getChannelConfig,
  type ChannelId,
  type ChannelScope,
} from "@/lib/channel";
import type { LogoCollection } from "@/lib/types";

// 빈 카탈로그 채널(avatars, sheet 등)이 요청마다 GitHub를 다시 받지 않도록 프로세스 단위로 기록
const emptyChannelsSynced = new Set<ChannelId>();

/** 해당 채널 DB가 비어 있으면 카탈로그 동기화 */
export async function ensureCatalogSynced(
  channelId: ChannelId = "logos",
): Promise<void> {
  if (emptyChannelsSynced.has(channelId)) return;

  const database = getDatabase();
  const row = database
    .prepare("SELECT COUNT(*) as count FROM logos WHERE channel = ?")
    .get(channelId) as { count: number };

  if (row.count === 0) {
    const result = await syncCatalogFromSource(channelId);
    if (result.synced === 0) emptyChannelsSynced.add(channelId);
  }
}

/** scope(현재 채널 또는 전체)에 해당하는 채널 카탈로그 동기화 */
export async function ensureScopeSynced(scope: ChannelScope): Promise<void> {
  const targetChannels = scope === "all" ? channelIds : [scope];
  for (const channelId of targetChannels) {
    await ensureCatalogSynced(channelId);
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
