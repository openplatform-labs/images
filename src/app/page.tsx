import { LogoCard } from "@/components/LogoCard";
import { ChannelHero } from "@/components/ChannelHero";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterPanel } from "@/components/FilterPanel";
import { GalleryPagination } from "@/components/GalleryPagination";
import { GalleryToolbar } from "@/components/GalleryToolbar";
import { AvatarsHome } from "@/components/AvatarsHome";
import { IconsHome } from "@/components/IconsHome";
import { IllustHome } from "@/components/IllustHome";
import { ImagesHome } from "@/components/ImagesHome";
import { PackageTabs } from "@/components/PackageTabs";
import { listCategories, listIconPacks, listImageHeroCandidates, listTags } from "@/lib/catalog";
import { getChannelTheme } from "@/lib/channel-theme";
import { formatIconPackLabel } from "@/lib/icon-pack";
import { getRequestChannelConfig } from "@/lib/request-channel";
import {
  getCollectionCountsForHome,
  getHomePageData,
  getPackageCountsForHome,
} from "@/lib/server-catalog";
import { buildStaticallyUrl } from "@/lib/statically";
import type { LogoCollection } from "@/lib/types";

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    collection?: string;
    source?: string;
    page?: string;
    sort?: string;
    group?: string;
    tab?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const channel = await getRequestChannelConfig();
  const theme = getChannelTheme(channel.id);
  const params = await searchParams;
  const activeCollection =
    channel.galleryGroupBy === "collection" &&
    (params.collection === "simple" || params.collection === "themed")
      ? (params.collection as LogoCollection)
      : undefined;
  const activePackage =
    channel.galleryGroupBy === "source" && params.source?.trim()
      ? params.source.trim()
      : undefined;

  const browsingIcons = Boolean(params.q?.trim() || params.source?.trim());
  const catalogParams =
    channel.id === "icons" && !browsingIcons ? { page: "1" } : params;

  const [result, categories, tags, collectionCounts, packageCounts, heroCandidates] =
    await Promise.all([
      getHomePageData(
        catalogParams,
        channel.id,
        channel.id === "images"
          ? 36
          : channel.id === "illust"
            ? 40
            : channel.id === "avatars"
              ? 48
              : channel.id === "icons"
                ? browsingIcons
                  ? 5000
                  : 8
                : channel.id === "pictograms"
                  ? 5000
                  : 48,
      ),
      Promise.resolve(listCategories(channel.id)),
      Promise.resolve(listTags()),
      Promise.resolve(getCollectionCountsForHome(channel.id)),
      Promise.resolve(
        channel.galleryGroupBy === "source"
          ? getPackageCountsForHome(channel.id)
          : [],
      ),
      Promise.resolve(
        channel.id === "images" ||
        channel.id === "illust" ||
        channel.id === "avatars"
          ? listImageHeroCandidates(channel.id)
          : [],
      ),
    ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  // Images: 풀블리드 시네마틱 구성
  if (channel.id === "images") {
    return (
      <ImagesHome
        title={channel.heroTitle}
        tagline={theme.heroTagline}
        description={channel.heroDescription}
        total={result.total}
        items={result.items}
        heroCandidates={heroCandidates}
        categories={categories}
        tags={tags}
        activeCategory={params.category}
        activeTag={params.tag}
        query={params.q}
        searchPlaceholder={channel.searchPlaceholder}
        page={result.page}
        totalPages={totalPages}
        searchParams={params}
        emptyLabel={channel.emptyLabel}
      />
    );
  }

  // Illust: 아틀리에 / 전시 벽 구성
  if (channel.id === "illust") {
    return (
      <IllustHome
        title={channel.heroTitle}
        tagline={theme.heroTagline}
        description={channel.heroDescription}
        total={result.total}
        items={result.items}
        featuredCandidates={heroCandidates}
        categories={categories}
        tags={tags}
        activeCategory={params.category}
        activeTag={params.tag}
        query={params.q}
        searchPlaceholder={channel.searchPlaceholder}
        page={result.page}
        totalPages={totalPages}
        searchParams={params}
        emptyLabel={channel.emptyLabel}
      />
    );
  }

  // Avatars: 아이덴티티 로스터 / 원형 초상
  if (channel.id === "avatars") {
    return (
      <AvatarsHome
        title={channel.heroTitle}
        tagline={theme.heroTagline}
        description={channel.heroDescription}
        total={result.total}
        items={result.items}
        featuredCandidates={heroCandidates}
        categories={categories}
        tags={tags}
        activeCategory={params.category}
        activeTag={params.tag}
        query={params.q}
        searchPlaceholder={channel.searchPlaceholder}
        page={result.page}
        totalPages={totalPages}
        searchParams={params}
        emptyLabel={channel.emptyLabel}
      />
    );
  }

  // Icons: 묶음 선반 + 전 팩 검색. 글리프는 원본 크기·카테고리로 보여 줌
  if (channel.id === "icons") {
    const packs = listIconPacks(channel.id);
    const totalIcons = packs.reduce((sum, pack) => sum + pack.count, 0);
    const browsing = Boolean(params.q?.trim() || params.source?.trim());
    const usage = activePackage
      ? {
          packSlug: activePackage,
          packLabel: formatIconPackLabel(activePackage),
          cdnBaseUrl: buildStaticallyUrl(`${activePackage}/`, channel.id),
          exampleName: "Add",
          exampleUrl: buildStaticallyUrl(`${activePackage}/add.svg`, channel.id),
          exampleSize: 24,
        }
      : null;
    return (
      <IconsHome
        channelId={channel.id}
        title={channel.heroTitle}
        tagline={theme.heroTagline}
        description={channel.heroDescription}
        eyebrow={theme.heroEyebrow}
        totalIcons={totalIcons}
        items={browsing ? result.items : []}
        packs={packs}
        activePack={activePackage}
        query={params.q}
        searchPlaceholder={channel.searchPlaceholder}
        emptyLabel={channel.emptyLabel}
        usage={usage}
      />
    );
  }

  // Pictograms: 호스트 단위 라이브러리 (아이콘 팩이 아님)
  if (channel.id === "pictograms") {
    const usage = {
      packSlug: channel.id,
      packLabel: channel.brandName,
      cdnBaseUrl: buildStaticallyUrl("", channel.id),
      exampleName: "Airplane",
      exampleUrl: buildStaticallyUrl("airplane.svg", channel.id),
      exampleSize: 48,
    };
    return (
      <IconsHome
        channelId={channel.id}
        title={channel.heroTitle}
        tagline={theme.heroTagline}
        description={channel.heroDescription}
        eyebrow={theme.heroEyebrow}
        totalIcons={result.total}
        items={result.items}
        packs={[]}
        query={params.q}
        searchPlaceholder={channel.searchPlaceholder}
        emptyLabel={channel.emptyLabel}
        usage={usage}
      />
    );
  }

  const gridClass =
    theme.galleryLayout === "studio"
      ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      : theme.galleryLayout === "glyph"
        ? "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <ChannelHero
        channelId={channel.id}
        title={channel.heroTitle}
        description={channel.heroDescription}
        total={result.total}
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <FilterPanel
          categories={categories}
          tags={tags}
          activeCategory={params.category}
          activeTag={params.tag}
          activeCollection={activeCollection}
          query={params.q}
          searchPlaceholder={channel.searchPlaceholder}
        />

        <div>
          {channel.galleryGroupBy === "collection" && (
            <CollectionTabs
              activeCollection={activeCollection}
              counts={collectionCounts}
              searchParams={params}
            />
          )}

          {channel.galleryGroupBy === "source" && (
            <PackageTabs
              activePackage={activePackage}
              packages={packageCounts}
              searchParams={params}
            />
          )}

          <GalleryToolbar
            total={result.total}
            page={result.page}
            totalPages={totalPages}
            sort={params.sort}
            itemLabelPlural={channel.itemLabelPlural}
            searchParams={params}
          />

          <div className={gridClass}>
            {result.items.map((logo, index) => (
              <LogoCard
                key={`${logo.channel}-${logo.shortname}`}
                logo={logo}
                index={index}
              />
            ))}
          </div>

          {result.items.length === 0 && (
            <div className="py-20 text-center text-muted">{channel.emptyLabel}</div>
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
