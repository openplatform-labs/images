"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImageFullView } from "@/components/ImageFullView";
import {
  formatBytes,
  formatDimensions,
  imageResolutionHints,
  imageResolutionLabels,
  isImageResolutionVariant,
  listImageResolutionFiles,
  pickDefaultImageResolution,
  pickLargestByPixels,
  pickLargestImageResolution,
} from "@/lib/image-resolutions";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import { toAbsoluteCdnUrl } from "@/lib/statically";
import type { Category, ChannelId, LogoCollection, LogoFile, Tag } from "@/lib/types";

interface IllustDetailViewProps {
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

export function IllustDetailView({
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
}: IllustDetailViewProps) {
  const resolutionFiles = useMemo(
    () => listImageResolutionFiles(files),
    [files],
  );
  const hasResolutions = resolutionFiles.length > 0;

  const stageFile = useMemo(() => {
    if (previewFilename) {
      const explicit = files.find((file) => file.filename === previewFilename);
      if (explicit) return explicit;
    }
    if (hasResolutions) {
      return (
        pickLargestByPixels(resolutionFiles) ??
        pickLargestImageResolution(resolutionFiles)
      );
    }
    return pickGalleryPreviewFile(files, shortname, collection, source);
  }, [
    previewFilename,
    hasResolutions,
    resolutionFiles,
    files,
    shortname,
    collection,
    source,
  ]);

  const [selectedFilename, setSelectedFilename] = useState(
    () =>
      (hasResolutions
        ? pickDefaultImageResolution(resolutionFiles)?.filename
        : stageFile?.filename) ?? "",
  );
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);

  const selected = hasResolutions
    ? (resolutionFiles.find((file) => file.filename === selectedFilename) ??
      resolutionFiles[0] ??
      null)
    : (files.find((file) => file.filename === selectedFilename) ??
      stageFile ??
      null);

  useEffect(() => {
    if (!copiedFilename) return;
    const timer = window.setTimeout(() => setCopiedFilename(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedFilename]);

  if (!stageFile || !selected) return null;

  const stageUrl = toAbsoluteCdnUrl(stageFile.staticallyUrl, channelId);
  const selectedUrl = toAbsoluteCdnUrl(selected.staticallyUrl, channelId);
  const stageLabel = isImageResolutionVariant(stageFile.role)
    ? imageResolutionLabels[stageFile.role]
    : "Artwork";
  const stageDimensions = formatDimensions(stageFile.width, stageFile.height);
  const selectedLabel = isImageResolutionVariant(selected.role)
    ? imageResolutionLabels[selected.role]
    : selected.role;
  const selectedDimensions = formatDimensions(
    selected.width,
    selected.height,
  );
  const selectedBytes = formatBytes(selected.bytes);
  const copyTargets = hasResolutions ? resolutionFiles : files;

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
    <div className="illust-detail pb-16">
      <section className="illust-detail-stage relative min-h-[min(88svh,900px)] w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setFullViewOpen(true)}
          className="absolute inset-0 cursor-zoom-in"
          aria-label="전체 보기 열기"
        >
          <div className="flex h-full w-full items-center justify-center p-6 md:p-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stageUrl}
              alt={name}
              className="max-h-[min(72vh,760px)] max-w-full object-contain drop-shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
            />
          </div>
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-5 md:px-8">
          <Link
            href="/"
            className="pointer-events-auto rounded-full border border-[color:var(--illust-line)] bg-[color:var(--illust-paper)]/90 px-3 py-1.5 text-xs font-medium text-[color:var(--illust-ink)] backdrop-blur-sm transition hover:border-[color:var(--illust-seal)]"
          >
            ← Wall
          </Link>
          <button
            type="button"
            onClick={() => setFullViewOpen(true)}
            className="pointer-events-auto rounded-full border border-[color:var(--illust-line)] bg-[color:var(--illust-paper)]/90 px-3 py-1.5 text-xs font-medium text-[color:var(--illust-ink)] backdrop-blur-sm transition hover:border-[color:var(--illust-seal)]"
          >
            전체 보기
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[color:var(--illust-paper)] via-[color:var(--illust-paper)]/80 to-transparent px-4 pb-8 pt-20 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
            {badgeLabel}
            {source ? ` · ${source}` : ""}
          </p>
          <h1 className="font-display mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-[color:var(--illust-ink)] md:text-5xl">
            {name}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">{shortname}</p>
          <p className="mt-3 text-xs text-muted">
            {stageLabel}
            {stageDimensions ? ` · ${stageDimensions}` : ""}
            <span className="mx-1.5">·</span>
            클릭하면 전체 화면
          </p>
        </div>
      </section>

      {(categories.length > 0 || tags.length > 0) && (
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 pt-8 md:px-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${category.slug}`}
              className="illust-chip"
            >
              {category.name}
            </Link>
          ))}
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/?tag=${tag.slug}`}
              className="illust-chip"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}

      <section className="mx-auto mt-8 max-w-5xl space-y-5 px-4 md:px-8">
        <div>
          <h2 className="font-display text-lg font-semibold text-[color:var(--illust-ink)]">
            CDN · 파일
          </h2>
          <p className="mt-1 text-sm text-muted">
            클릭하면 절대경로가 복사됩니다.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {copyTargets.map((file) => {
            const active = file.filename === selected.filename;
            const justCopied = file.filename === copiedFilename;
            const label = isImageResolutionVariant(file.role)
              ? imageResolutionLabels[file.role]
              : file.role;
            const hint = isImageResolutionVariant(file.role)
              ? imageResolutionHints[file.role]
              : file.filename;
            const fileDimensions = formatDimensions(file.width, file.height);
            const fileBytes = formatBytes(file.bytes);

            return (
              <button
                key={file.filename}
                type="button"
                onClick={() => void handleSelectAndCopy(file)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[color:var(--illust-seal)] bg-[color:var(--illust-seal)]/8 ring-1 ring-[color:var(--illust-seal)]/30"
                    : "border-[color:var(--illust-line)] bg-[color:var(--illust-paper)] hover:border-[color:var(--illust-seal)]/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wide ${
                      justCopied || active
                        ? "text-[color:var(--illust-seal)]"
                        : "text-muted"
                    }`}
                  >
                    {justCopied ? "복사됨!" : active ? "선택됨" : "클릭 복사"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{hint}</p>
                <p className="mt-2 font-mono text-[11px] text-muted">
                  {[fileDimensions, fileBytes].filter(Boolean).join(" · ") ||
                    file.filename}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[color:var(--illust-line)] bg-[color:var(--illust-paper)] p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            CDN 절대경로 · {selectedLabel}
            {copiedFilename === selected.filename ? " · 복사됨" : ""}
          </p>
          <code className="block break-all text-sm text-[color:var(--illust-seal)]">
            {selectedUrl}
          </code>
          <p className="mt-2 text-xs text-muted">
            {[selectedDimensions, selectedBytes].filter(Boolean).join(" · ")}
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-dashed border-[color:var(--illust-line)] p-3 text-xs text-muted">
{`<img src="${selectedUrl}" alt="${name}" />`}
          </pre>
        </div>
      </section>

      {fullViewOpen && (
        <ImageFullView
          src={stageUrl}
          alt={name}
          label={stageLabel}
          dimensions={stageDimensions}
          onClose={() => setFullViewOpen(false)}
        />
      )}
    </div>
  );
}
