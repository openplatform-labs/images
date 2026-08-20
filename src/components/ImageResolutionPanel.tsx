"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageFullView } from "@/components/ImageFullView";
import { LogoImage } from "@/components/LogoImage";
import { LogoPreviewFrame } from "@/components/LogoPreviewFrame";
import { PreviewThemeSwitcher } from "@/components/PreviewThemeSwitcher";
import {
  formatBytes,
  formatDimensions,
  imageResolutionHints,
  imageResolutionLabels,
  isImageResolutionVariant,
  listImageResolutionFiles,
  pickDefaultImageResolution,
  pickLargestImageResolution,
} from "@/lib/image-resolutions";
import { toAbsoluteCdnUrl } from "@/lib/statically";
import type { ChannelId, LogoFile } from "@/lib/types";

interface ImageResolutionPanelProps {
  files: LogoFile[];
  name: string;
  channelId: ChannelId;
}

export function ImageResolutionPanel({
  files,
  name,
  channelId,
}: ImageResolutionPanelProps) {
  const resolutionFiles = useMemo(
    () => listImageResolutionFiles(files),
    [files],
  );
  const largestFile = useMemo(
    () => pickLargestImageResolution(resolutionFiles),
    [resolutionFiles],
  );
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

  if (!selected || !largestFile) return null;

  const absoluteUrl = toAbsoluteCdnUrl(selected.staticallyUrl, channelId);
  const largestAbsoluteUrl = toAbsoluteCdnUrl(
    largestFile.staticallyUrl,
    channelId,
  );
  const roleLabel = isImageResolutionVariant(selected.role)
    ? imageResolutionLabels[selected.role]
    : selected.role;
  const dimensions = formatDimensions(selected.width, selected.height);
  const sizeLabel = formatBytes(selected.bytes);
  const largestLabel = isImageResolutionVariant(largestFile.role)
    ? imageResolutionLabels[largestFile.role]
    : largestFile.role;
  const largestDimensions = formatDimensions(
    largestFile.width,
    largestFile.height,
  );

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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFullViewOpen(true)}
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent hover:text-accent"
          >
            전체 보기
          </button>
          <PreviewThemeSwitcher />
        </div>
        <LogoPreviewFrame large className="rounded-2xl">
          <button
            type="button"
            onClick={() => setFullViewOpen(true)}
            className="block w-full cursor-zoom-in"
            aria-label="전체 보기 열기"
          >
            <LogoImage
              src={absoluteUrl}
              alt={`${name} ${roleLabel}`}
              size="detail"
            />
          </button>
        </LogoPreviewFrame>
        <p className="text-center text-xs text-muted">
          미리보기 · 선택 해상도:{" "}
          <span className="text-foreground">{roleLabel}</span>
          {dimensions ? ` · ${dimensions}` : ""}
          {sizeLabel ? ` · ${sizeLabel}` : ""}
          <span className="mx-1.5 text-border">·</span>
          클릭하면 {largestLabel} 전체 보기
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">해상도 선택</h2>
          <p className="mt-1 text-sm text-muted">
            사이즈 카드를 클릭하면 CDN 절대경로가 바로 복사됩니다. Original이
            실사용 권장입니다.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
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
                    : "border-border bg-surface-elevated hover:border-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wide ${
                      justCopied
                        ? "text-accent"
                        : active
                          ? "text-accent"
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

        <div className="rounded-lg border border-border bg-surface-elevated p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            CDN 절대경로 · {roleLabel}
            {copiedFilename === selected.filename ? " · 복사됨" : ""}
          </p>
          <code className="block break-all text-sm text-accent">
            {absoluteUrl}
          </code>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-dashed border-border p-3 text-xs text-muted">
{`<img src="${absoluteUrl}" alt="${name}" />`}
          </pre>
        </div>
      </section>

      {fullViewOpen && (
        <ImageFullView
          src={largestAbsoluteUrl}
          alt={name}
          label={largestLabel}
          dimensions={largestDimensions}
          onClose={() => setFullViewOpen(false)}
        />
      )}
    </div>
  );
}
