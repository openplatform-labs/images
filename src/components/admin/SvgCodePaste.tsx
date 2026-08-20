"use client";

import { useEffect, useState } from "react";
import type { DroppedFile } from "@/components/admin/LogoDropZone";
import { slugify } from "@/lib/slug";

interface SvgCodePasteProps {
  files: DroppedFile[];
  onFilesChange: (files: DroppedFile[]) => void;
  onMetaSuggest: (meta: { shortname: string; name: string }) => void;
  disabled?: boolean;
  /** 파일명 힌트용 shortname */
  preferredShortname?: string;
  /** 아직 목록에 넣지 않은 SVG 코드 (저장 시 자동 반영용) */
  onPendingCodeChange?: (code: string) => void;
}

/** SVG 마크업 정리·검증 */
export function normalizeSvgMarkup(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("SVG 코드를 입력하세요.");
  }
  if (!/<svg[\s>]/i.test(trimmed)) {
    throw new Error("유효한 SVG 코드가 아닙니다. <svg> 루트가 필요합니다.");
  }
  // 관리자 입력 자산에서도 script 제거
  return trimmed.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

export function SvgCodePaste({
  files,
  onFilesChange,
  onMetaSuggest,
  disabled,
  preferredShortname,
  onPendingCodeChange,
}: SvgCodePasteProps) {
  const [svgCode, setSvgCode] = useState("");
  const [filenameHint, setFilenameHint] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    onPendingCodeChange?.(svgCode);
  }, [svgCode, onPendingCodeChange]);

  useEffect(() => {
    const trimmed = svgCode.trim();
    if (!trimmed || !/<svg[\s>]/i.test(trimmed)) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(
      new Blob([trimmed], { type: "image/svg+xml" }),
    );
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [svgCode]);

  function handleAdd() {
    setError("");
    try {
      const content = normalizeSvgMarkup(svgCode);
      const base =
        slugify(filenameHint) ||
        slugify(preferredShortname ?? "") ||
        "logo";
      const filename = base.endsWith(".svg") ? base : `${base}.svg`;
      const file = new File([content], filename, {
        type: "image/svg+xml",
      });
      const id = `paste-${filename}-${Date.now()}`;
      const next: DroppedFile = {
        file,
        previewUrl: URL.createObjectURL(file),
        id,
      };
      onFilesChange([...files, next]);
      onMetaSuggest({
        shortname: base.replace(/\.svg$/i, ""),
        name: base
          .replace(/\.svg$/i, "")
          .split(/[-_]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      });
      setSvgCode("");
      setFilenameHint("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "추가 실패");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_160px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          파일명 (선택)
          <input
            value={filenameHint}
            onChange={(event) => setFilenameHint(event.target.value)}
            placeholder={preferredShortname || "react, vercel..."}
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-sm normal-case tracking-normal text-foreground"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !svgCode.trim()}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold transition hover:border-accent disabled:opacity-40"
          >
            목록에 추가
          </button>
        </div>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
        SVG 코드
        <textarea
          value={svgCode}
          onChange={(event) => setSvgCode(event.target.value)}
          disabled={disabled}
          rows={10}
          spellCheck={false}
          placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  ...\n</svg>`}
          className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-accent"
        />
      </label>

      {previewUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface-elevated p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="SVG 미리보기"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <p className="text-xs text-muted">
            미리보기 — 아래 저장 시 이 코드도 함께 업로드됩니다
            {preferredShortname ? ` (${preferredShortname}.svg)` : ""}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
