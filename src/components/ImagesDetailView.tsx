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
import { toAbsoluteCdnUrl } from "@/lib/statically";
import type { Category, ChannelId, LogoFile, Tag } from "@/lib/types";

interface ImagesDetailViewProps {
  name: string;
  shortname: string;
  badgeLabel: string;
  source?: string | null;
  categories: Category[];
  tags: Tag[];
  files: LogoFile[];
  channelId: ChannelId;
  previewFilename?: string | null;
}

export function ImagesDetailView({
  name,
  shortname,
  badgeLabel,
  source,
  categories,
  tags,
  files,
  channelId,
  previewFilename,
}: ImagesDetailViewProps) {
  const resolutionFiles = useMemo(
    () => listImageResolutionFiles(files),
    [files],
  );
  const stageFile = useMemo(() => {
    if (previewFilename) {
      const explicit = files.find((file) => file.filename === previewFilename);
      if (explicit) return explicit;
    }
    return (
      pickLargestByPixels(resolutionFiles) ??
      pickLargestImageResolution(resolutionFiles)
    );
  }, [previewFilename, files, resolutionFiles]);
  const [selectedFilename, setSelectedFilename] = useState(
    () => pickDefaultImageResolution(resolutionFiles)?.filename ?? "",
  );
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);

  const selected =
    resolutionFiles.find((file) => file.filename === selectedFilename) ??
    resolutionFiles[0] ??
    null;

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
    : stageFile.role;
  const stageDimensions = formatDimensions(stageFile.width, stageFile.height);
  const selectedLabel = isImageResolutionVariant(selected.role)
    ? imageResolutionLabels[selected.role]
    : selected.role;
  const selectedDimensions = formatDimensions(
    selected.width,
    selected.height,
  );
  const selectedBytes = formatBytes(selected.bytes);

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
    <div className="pb-16">
      {/* 스테이지: 최대 해상도를 화면 대부분에 표시 */}
      <section className="relative min-h-[min(88svh,920px)] w-full overflow-hidden bg-[#0a0c10]">
        <button
          type="button"
          onClick={() => setFullViewOpen(true)}
          className="absolute inset-0 cursor-zoom-in"
          aria-label="전체 보기 열기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stageUrl}
            alt={name}
            className="h-full w-full object-contain"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/35"
            aria-hidden
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-5 md:px-8">
          <Link
            href="/"
            className="pointer-events-auto rounded-md border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/55"
          >
            ← Gallery
          </Link>
          <button
            type="button"
            onClick={() => setFullViewOpen(true)}
            className="pointer-events-auto rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            전체 보기
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-8 pt-24 md:px-8 md:pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            {badgeLabel}
            {source ? ` · ${source}` : ""}
          </p>
          <h1 className="font-display mt-2 max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            {name}
          </h1>
          <p className="mt-2 font-mono text-sm text-white/55">{shortname}</p>
          <p className="mt-3 text-xs text-white/45">
            스테이지 · {stageLabel}
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
              className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/?tag=${tag.slug}`}
              className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      <section className="mx-auto mt-8 max-w-5xl space-y-5 px-4 md:px-8">
        <div>
          <h2 className="font-display text-lg font-semibold">해상도 · CDN</h2>
          <p className="mt-1 text-sm text-muted">
            사이즈를 클릭하면 CDN 절대경로가 복사됩니다. 스테이지에는 보유 중
            가장 큰 이미지가 표시됩니다.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {resolutionFiles.map((file) => {
            const active = file.filename === selected.filename;
            const justCopied = file.filename === copiedFilename;
            const label = isImageResolutionVariant(file.role)
              ? imageResolutionLabels[file.role]
              : file.role;
            const hint = isImageResolutionVariant(file.role)
              ? imageResolutionHints[file.role]
              : "";
            const fileDimensions = formatDimensions(file.width, file.height);
            const fileBytes = formatBytes(file.bytes);

            return (
              <button
                key={file.filename}
                type="button"
                onClick={() => void handleSelectAndCopy(file)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                    : "border-border bg-surface hover:border-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wide ${
                      justCopied || active ? "text-accent" : "text-muted"
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

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            CDN 절대경로 · {selectedLabel}
            {copiedFilename === selected.filename ? " · 복사됨" : ""}
          </p>
          <code className="block break-all text-sm text-accent">
            {selectedUrl}
          </code>
          <p className="mt-2 text-xs text-muted">
            {[selectedDimensions, selectedBytes].filter(Boolean).join(" · ")}
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-dashed border-border p-3 text-xs text-muted">
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
