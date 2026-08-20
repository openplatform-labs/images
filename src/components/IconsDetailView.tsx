"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImageFullView } from "@/components/ImageFullView";
import { formatIconPackLabel, isPictogramPack } from "@/lib/icon-pack";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { toAbsoluteCdnUrl } from "@/lib/statically";
import type { Category, ChannelId, LogoCollection, LogoFile, Tag } from "@/lib/types";

interface IconsDetailViewProps {
  name: string;
  shortname: string;
  badgeLabel: string;
  source?: string | null;
  collection: LogoCollection;
  categories: Category[];
  tags: Tag[];
  files: LogoFile[];
  channelId: ChannelId;
  previewFilename?: string | null;
}

export function IconsDetailView({
  name,
  shortname,
  badgeLabel,
  source,
  collection,
  categories,
  tags,
  files,
  channelId,
  previewFilename,
}: IconsDetailViewProps) {
  const stageFile = useMemo(
    () =>
      pickGalleryPreviewFile(
        files,
        shortname,
        collection,
        source,
        previewFilename,
      ),
    [files, shortname, collection, source, previewFilename],
  );
  const [selectedFilename, setSelectedFilename] = useState(
    () => stageFile?.filename ?? "",
  );
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);

  const selected =
    files.find((file) => file.filename === selectedFilename) ?? stageFile ?? null;

  useEffect(() => {
    if (!copiedFilename) return;
    const timer = window.setTimeout(() => setCopiedFilename(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedFilename]);

  if (!stageFile || !selected) return null;

  const packLabel = formatIconPackLabel(source);
  const pictogramView = channelId === "pictograms" || isPictogramPack(source);
  const stageUrl = toAbsoluteCdnUrl(stageFile.staticallyUrl, channelId);
  const selectedUrl = toAbsoluteCdnUrl(selected.staticallyUrl, channelId);
  const stageGlyphSize = pictogramView ? 160 : 96;

  async function handleSelectAndCopy(file: LogoFile) {
    setSelectedFilename(file.filename);
    const url = toAbsoluteCdnUrl(file.staticallyUrl, channelId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFilename(file.filename);
    } catch {
      // 클립보드 권한이 없으면 선택만 반영
    }
  }

  return (
    <div className="icons-detail pb-16">
      <section className="icons-detail-stage relative min-h-[min(52svh,560px)] w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setFullViewOpen(true)}
          className="absolute inset-0 cursor-zoom-in"
          aria-label="전체 보기 열기"
        >
          <div className="flex h-full w-full items-center justify-center p-8 md:p-16">
            <div
              className={`icons-stage-tile relative flex items-center justify-center ${
                pictogramView
                  ? "h-64 w-64 md:h-72 md:w-72"
                  : "h-44 w-44 md:h-52 md:w-52"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stageUrl}
                alt={name}
                width={stageGlyphSize}
                height={stageGlyphSize}
                className={`icons-glyph-mark icons-glyph-mark--stage ${
                  pictogramView ? "icons-glyph-mark--stage-pictogram" : ""
                }`}
              />
            </div>
          </div>
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-5 md:px-8">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="pointer-events-auto rounded-full border border-[color:var(--icons-line)] bg-[color:var(--icons-navy)]/90 px-3 py-1.5 text-xs font-medium text-[color:var(--icons-ink)] backdrop-blur-sm transition hover:border-[color:var(--icons-cyan)]"
            >
              {channelId === "pictograms" ? "← Library" : "← Packs"}
            </Link>
            {source && channelId !== "pictograms" && (
              <Link
                href={`/?source=${encodeURIComponent(source)}`}
                className="pointer-events-auto rounded-full border border-[color:var(--icons-cyan)]/40 bg-[color:var(--icons-navy)]/90 px-3 py-1.5 text-xs font-medium text-[color:var(--icons-cyan)] backdrop-blur-sm"
              >
                {packLabel}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFullViewOpen(true)}
            className="pointer-events-auto rounded-full border border-[color:var(--icons-line)] bg-[color:var(--icons-navy)]/90 px-3 py-1.5 text-xs font-medium text-[color:var(--icons-ink)] backdrop-blur-sm transition hover:border-[color:var(--icons-cyan)]"
          >
            전체 보기
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[color:var(--icons-navy)] via-[color:var(--icons-navy)]/85 to-transparent px-4 pb-8 pt-20 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--icons-cyan)]">
            {badgeLabel}
            {source ? ` · ${packLabel}` : ""}
          </p>
          <h1 className="font-display mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-[color:var(--icons-ink)] md:text-5xl">
            {name}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">{shortname}</p>
        </div>
      </section>

      {(categories.length > 0 || tags.length > 0) && (
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 pt-8 md:px-8">
          {categories.map((category) => (
            <span key={category.id} className="icons-chip">
              {category.name}
            </span>
          ))}
          {tags.map((tag) => (
            <span key={tag.id} className="icons-chip">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <section className="mx-auto mt-8 max-w-5xl space-y-5 px-4 md:px-8">
        <div>
          <h2 className="font-display text-lg font-semibold text-[color:var(--icons-ink)]">
            CDN · 파일
          </h2>
          <p className="mt-1 text-sm text-muted">클릭하면 절대경로가 복사됩니다.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => {
            const active = file.filename === selected.filename;
            const justCopied = file.filename === copiedFilename;
            return (
              <button
                key={file.filename}
                type="button"
                onClick={() => void handleSelectAndCopy(file)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[color:var(--icons-cyan)] bg-[color:var(--icons-cyan)]/8 ring-1 ring-[color:var(--icons-cyan)]/30"
                    : "border-[color:var(--icons-line)] bg-[color:var(--icons-panel)] hover:border-[color:var(--icons-cyan)]/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{file.filename}</p>
                  <span
                    className={`shrink-0 text-[10px] font-medium uppercase tracking-wide ${
                      justCopied || active
                        ? "text-[color:var(--icons-cyan)]"
                        : "text-muted"
                    }`}
                  >
                    {justCopied ? "복사됨!" : active ? "선택됨" : "클릭 복사"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[color:var(--icons-line)] bg-[color:var(--icons-panel)] p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            CDN 절대경로
            {copiedFilename === selected.filename ? " · 복사됨" : ""}
          </p>
          <code className="block break-all text-sm text-[color:var(--icons-cyan)]">
            {selectedUrl}
          </code>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-dashed border-[color:var(--icons-line)] p-3 text-xs text-muted">
{`<img src="${selectedUrl}" alt="${name}" width="24" height="24" />`}
          </pre>
        </div>
      </section>

      {fullViewOpen && (
        <ImageFullView
          src={stageUrl}
          alt={name}
          label={packLabel}
          onClose={() => setFullViewOpen(false)}
        />
      )}
    </div>
  );
}
