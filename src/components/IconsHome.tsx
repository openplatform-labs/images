"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { IconPackPreview, LogoEntry } from "@/lib/types";
import { getChannelConfig } from "@/lib/channel";
import {
  getIconLibrarySection,
  getIconLibrarySectionIndex,
  listLibrarySections,
  slugifyLibrarySection,
} from "@/lib/carbon-icon-category";
import { formatIconPackLabel, isPictogramPack } from "@/lib/icon-pack";
import type { ChannelId } from "@/lib/channel";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { IconGlyphCard } from "@/components/IconGlyphCard";
import { IconPackUsageBar } from "@/components/IconPackUsageBar";

interface IconsHomeProps {
  channelId?: ChannelId;
  title: string;
  tagline: string;
  description: string;
  eyebrow?: string;
  totalIcons: number;
  items: LogoEntry[];
  packs: IconPackPreview[];
  activePack?: string;
  query?: string;
  searchPlaceholder: string;
  emptyLabel: string;
  usage?: {
    packSlug: string;
    packLabel: string;
    cdnBaseUrl: string;
    exampleName: string;
    exampleUrl: string;
    exampleSize?: number;
  } | null;
}

function previewUrl(entry: LogoEntry): string | null {
  const file = pickGalleryPreviewFile(
    entry.files,
    entry.shortname,
    entry.collection,
    entry.source,
    entry.previewFilename,
  );
  return file?.staticallyUrl ?? null;
}

function buildHref(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...patch })) {
    if (key === "page" && (!value || value === "1")) continue;
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function groupEntries(
  items: LogoEntry[],
  groupByPack: boolean,
  activePack?: string,
) {
  const groups: { title: string; items: LogoEntry[] }[] = [];
  for (const item of items) {
    const title = groupByPack
      ? formatIconPackLabel(item.source)
      : getIconLibrarySection(item.shortname, item.source);
    let group = groups.find((entry) => entry.title === title);
    if (!group) {
      group = { title, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.sort((left, right) =>
    groupByPack
      ? left.title.localeCompare(right.title)
      : getIconLibrarySectionIndex(left.title, activePack) -
        getIconLibrarySectionIndex(right.title, activePack),
  );
}

/** 빈 선반용 예시 묶음 */
const ghostPacks = [
  { label: "IBM Carbon", slug: "carbon" },
  { label: "Lucide", slug: "lucide" },
];

export function IconsHome({
  channelId = "icons",
  title,
  tagline,
  description,
  eyebrow = "Glyph foundry",
  totalIcons,
  items,
  packs,
  activePack,
  query,
  searchPlaceholder,
  emptyLabel,
  usage,
}: IconsHomeProps) {
  const libraryMode = channelId === "pictograms";
  const browsing = libraryMode || Boolean(query?.trim() || activePack);
  const groupedByPack = Boolean(query?.trim()) && !activePack && !libraryMode;
  const detailPrefix = getChannelConfig(channelId).detailPathPrefix;
  const sectionSource = libraryMode ? "pictograms" : activePack;
  const activePackLabel = activePack ? formatIconPackLabel(activePack) : null;
  const [sectionSlug, setSectionSlug] = useState("");
  const chipParams = { q: query, page: undefined };

  const scopedItems = useMemo(() => {
    if (!sectionSlug) return items;
    return items.filter(
      (item) =>
        slugifyLibrarySection(
          getIconLibrarySection(item.shortname, item.source),
        ) === sectionSlug,
    );
  }, [items, sectionSlug]);

  const groups = groupEntries(scopedItems, groupedByPack, sectionSource);
  const sectionOptions = listLibrarySections(sectionSource).filter((section) =>
    items.some(
      (item) => getIconLibrarySection(item.shortname, item.source) === section,
    ),
  );
  const showCategoryChips =
    (libraryMode || Boolean(activePack)) && sectionOptions.length > 1;

  return (
    <div className="icons-home">
      <section className="icons-hero relative isolate overflow-hidden">
        <div className="icons-grid-bg pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-12 pt-28 md:px-10 md:pb-16 md:pt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[color:var(--icons-cyan)]">
            {eyebrow}
          </p>
          <h1 className="font-display mt-3 text-5xl font-bold tracking-tight text-[color:var(--icons-ink)] md:text-7xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[color:var(--icons-ink-soft)] md:text-lg">
            {tagline}
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>

          {/* 전 묶음 검색 — source를 보내지 않음 */}
          <form action="/" method="get" className="icons-search mt-8 flex w-full max-w-2xl overflow-hidden">
            <input
              name="q"
              defaultValue={query}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted md:text-base"
            />
            <button
              type="submit"
              className="bg-[color:var(--icons-cyan)] px-6 text-sm font-semibold text-[color:var(--icons-navy)] transition hover:brightness-110"
            >
              {libraryMode ? "검색" : "전체 검색"}
            </button>
          </form>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            {libraryMode
              ? `${totalIcons.toLocaleString()} pictograms · category library`
              : `${packs.length.toLocaleString()} packs · ${totalIcons.toLocaleString()} glyphs · search every bundle`}
          </p>
        </div>
      </section>

      {!libraryMode ? (
      <div className="icons-rail sticky top-0 z-40 border-y border-[color:var(--icons-line)] bg-[color:var(--icons-navy)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-4 py-3 md:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href={buildHref(chipParams, { source: undefined })}
            className={`icons-chip shrink-0 ${!activePack ? "is-active" : ""}`}
          >
            All packs
          </Link>
          {packs.map((pack) => (
            <Link
              key={pack.slug}
              href={buildHref(chipParams, { source: pack.slug })}
              className={`icons-chip shrink-0 ${
                activePack === pack.slug ? "is-active" : ""
              }`}
            >
              {pack.label}
              <span className="opacity-60">{pack.count}</span>
            </Link>
          ))}
        </div>
      </div>
      ) : null}

      <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 md:py-14">
        {browsing ? (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-[color:var(--icons-ink)] md:text-3xl">
                  {query
                    ? libraryMode
                      ? `“${query}”`
                      : `“${query}” across ${activePackLabel ?? "all packs"}`
                    : libraryMode
                      ? "IBM Carbon Pictograms"
                      : activePackLabel}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {query && !libraryMode
                    ? "모든 묶음에서 검색한 결과입니다. 셀을 누르면 개별 보기, 복사 버튼은 CDN 주소입니다."
                    : "셀을 누르면 개별 보기입니다. 복사 버튼으로 CDN 주소를 가져가세요."}
                </p>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {scopedItems.length.toLocaleString()} glyphs
              </p>
            </div>

            {usage && !query && (
              <IconPackUsageBar
                packLabel={usage.packLabel}
                packSlug={usage.packSlug}
                cdnBaseUrl={usage.cdnBaseUrl}
                exampleName={usage.exampleName}
                exampleUrl={usage.exampleUrl}
                exampleSize={usage.exampleSize}
              />
            )}

            {showCategoryChips ? (
              <div className="mb-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSectionSlug("")}
                  className={`icons-chip ${sectionSlug === "" ? "is-active" : ""}`}
                >
                  All {libraryMode ? "pictograms" : "icons"}
                </button>
                {sectionOptions.map((section) => {
                  const slug = slugifyLibrarySection(section);
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setSectionSlug(slug)}
                      className={`icons-chip ${sectionSlug === slug ? "is-active" : ""}`}
                    >
                      {section}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {scopedItems.length === 0 ? (
              <div className="icons-empty flex min-h-[36vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="font-display text-xl text-[color:var(--icons-ink)]">
                  일치하는 {libraryMode ? "픽토그램" : "아이콘"}이 없습니다.
                </p>
                <Link href="/" className="text-sm text-[color:var(--icons-cyan)]">
                  {libraryMode ? "라이브러리로" : "묶음 선반으로"}
                </Link>
              </div>
            ) : (
              <div className="space-y-12">
                {groups.map((group) => (
                  <div key={group.title} className="icons-library-section">
                    <h3>{group.title}</h3>
                    <div
                      className={`icons-library-grid ${
                        libraryMode ||
                        group.items.every((item) => isPictogramPack(item.source))
                          ? "icons-library-grid--pictogram"
                          : ""
                      }`}
                    >
                      {group.items.map((item) => (
                        <IconGlyphCard
                          key={item.shortname}
                          name={item.name}
                          shortname={item.shortname}
                          href={`${detailPrefix}/${item.shortname}`}
                          imageUrl={previewUrl(item)}
                          channelId={channelId}
                          size={
                            libraryMode || isPictogramPack(item.source)
                              ? "pictogram"
                              : "icon"
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : packs.length === 0 ? (
          <div>
            <h2 className="font-display text-2xl text-[color:var(--icons-ink)] md:text-3xl">
              Pack shelf
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted">
              {emptyLabel} Admin에서 묶음 slug를 지정해 SVG를 올리면 선반이 채워집니다.
              IBM Carbon은 <span className="font-mono text-[color:var(--icons-cyan)]">carbon</span>{" "}
              으로 올리면 됩니다.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ghostPacks.map((pack) => (
                <div key={pack.slug} className="icons-pack-card icons-pack-ghost p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    {pack.slug}
                  </p>
                  <p className="mt-2 font-display text-xl text-[color:var(--icons-ink)]">
                    {pack.label}
                  </p>
                  <div className="mt-5 grid grid-cols-4 gap-2 opacity-30">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="icons-glyph-tile aspect-square" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="font-display text-2xl text-[color:var(--icons-ink)] md:text-3xl">
                Pack shelf
              </h2>
              <p className="mt-1 text-sm text-muted">
                묶음을 열어 글리프를 보거나, 위에서 모든 팩을 한꺼번에 검색하세요.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <Link
                  key={pack.slug}
                  href={`/?source=${encodeURIComponent(pack.slug)}`}
                  className="icons-pack-card group block p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--icons-cyan)]">
                        {pack.slug}
                      </p>
                      <p className="mt-1 font-display text-xl text-[color:var(--icons-ink)]">
                        {pack.label}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted">
                      {pack.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {pack.previews.slice(0, 8).map((preview) => (
                      <div key={preview.shortname} className="icons-glyph-tile aspect-square">
                        <Image
                          src={preview.imageUrl}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="icons-glyph-mark icons-glyph-mark--preview"
                        />
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
