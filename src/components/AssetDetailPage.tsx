import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageResolutionPanel } from "@/components/ImageResolutionPanel";
import { AvatarsDetailView } from "@/components/AvatarsDetailView";
import { IconsDetailView } from "@/components/IconsDetailView";
import { IllustDetailView } from "@/components/IllustDetailView";
import { ImagesDetailView } from "@/components/ImagesDetailView";
import { LogoDetailPreview } from "@/components/LogoDetailPreview";
import { StaticallyUrlPanel } from "@/components/StaticallyUrlPanel";
import { collectionLabels } from "@/lib/collection";
import { getLogoByShortname } from "@/lib/catalog";
import { getChannelConfig, type ChannelId } from "@/lib/channel";
import { listImageResolutionFiles } from "@/lib/image-resolutions";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { ensureCatalogSynced } from "@/lib/server-catalog";

interface AssetDetailPageProps {
  params: Promise<{ shortname: string }>;
  channelId: ChannelId;
}

export async function AssetDetailPage({
  params,
  channelId,
}: AssetDetailPageProps) {
  await ensureCatalogSynced(channelId);
  const { shortname } = await params;
  const logo = getLogoByShortname(shortname, channelId);

  if (!logo) notFound();

  const primaryFile = pickGalleryPreviewFile(
    logo.files,
    logo.shortname,
    logo.collection,
    logo.source,
    logo.previewFilename,
  );
  const channel = getChannelConfig(channelId);
  const hasResolutions =
    channelId !== "logos" && listImageResolutionFiles(logo.files).length > 0;

  // 이미지 채널: 풀뷰포트 스테이지 + 해상도 CDN 패널
  if (channelId === "images" && hasResolutions) {
    return (
      <ImagesDetailView
        name={logo.name}
        shortname={logo.shortname}
        badgeLabel={channel.badgeLabel}
        source={logo.source}
        categories={logo.categories}
        tags={logo.tags}
        files={logo.files}
        channelId={channelId}
        previewFilename={logo.previewFilename}
      />
    );
  }

  // 일러스트 채널: 아틀리에 대형 매트 + CDN 패널
  if (channelId === "illust") {
    return (
      <IllustDetailView
        name={logo.name}
        shortname={logo.shortname}
        badgeLabel={channel.badgeLabel}
        source={logo.source}
        collection={logo.collection}
        categories={logo.categories}
        tags={logo.tags}
        files={logo.files}
        channelId={channelId}
        previewFilename={logo.previewFilename}
      />
    );
  }

  // 아바타 채널: 원형 스테이지 + CDN 패널
  if (channelId === "avatars") {
    return (
      <AvatarsDetailView
        name={logo.name}
        shortname={logo.shortname}
        badgeLabel={channel.badgeLabel}
        source={logo.source}
        collection={logo.collection}
        categories={logo.categories}
        tags={logo.tags}
        files={logo.files}
        channelId={channelId}
        previewFilename={logo.previewFilename}
      />
    );
  }

  // 아이콘·픽토그램: 파운드리 스테이지 + CDN 패널
  if (channelId === "icons" || channelId === "pictograms") {
    return (
      <IconsDetailView
        name={logo.name}
        shortname={logo.shortname}
        badgeLabel={channel.badgeLabel}
        source={logo.source}
        collection={logo.collection}
        categories={logo.categories}
        tags={logo.tags}
        files={logo.files}
        channelId={channelId}
        previewFilename={logo.previewFilename}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← Gallery
      </Link>

      <div className="mt-8 space-y-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{logo.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{logo.shortname}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
            {channelId === "logos"
              ? collectionLabels[logo.collection]
              : channel.badgeLabel}
            {logo.source ? ` · ${logo.source}` : ""}
          </p>
        </div>

        {(logo.categories.length > 0 || logo.tags.length > 0) && (
          <div className="flex flex-wrap justify-center gap-2">
            {logo.categories.map((category) => (
              <Link
                key={category.id}
                href={`/?category=${category.slug}`}
                className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted"
              >
                {category.name}
              </Link>
            ))}
            {logo.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/?tag=${tag.slug}`}
                className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {hasResolutions ? (
          <ImageResolutionPanel
            files={logo.files}
            name={logo.name}
            channelId={channelId}
          />
        ) : (
          <>
            <LogoDetailPreview
              imageUrl={primaryFile?.staticallyUrl ?? ""}
              name={logo.name}
            />
            <StaticallyUrlPanel
              files={logo.files}
              logoName={logo.name}
              channelId={channelId}
            />
          </>
        )}
      </div>
    </div>
  );
}
