"use client";

import { useState } from "react";

interface IconPackUsageBarProps {
  packLabel: string;
  packSlug: string;
  cdnBaseUrl: string;
  exampleName: string;
  exampleUrl: string;
  exampleSize?: number;
}

export function IconPackUsageBar({
  packLabel,
  packSlug,
  cdnBaseUrl,
  exampleName,
  exampleUrl,
  exampleSize = 24,
}: IconPackUsageBarProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const htmlSnippet = `<img src="${exampleUrl}" alt="${exampleName}" width="${exampleSize}" height="${exampleSize}" />`;
  const cssSnippet = `.icon-${packSlug} {
  width: ${exampleSize}px;
  height: ${exampleSize}px;
  background: currentColor;
  -webkit-mask: url("${exampleUrl}") center / contain no-repeat;
  mask: url("${exampleUrl}") center / contain no-repeat;
}`;

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      // 권한 없으면 무시
    }
  }

  return (
    <div className="icons-usage mb-8 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--icons-cyan)]">
        {packLabel} · 바로 쓰기
      </p>
      <p className="mt-1 text-sm text-muted">
        셀을 누르면 개별 보기, 복사 버튼으로 CDN 주소를 가져갈 수 있습니다.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <UsageCopyBlock
          label="CDN 폴더"
          value={cdnBaseUrl}
          copied={copiedKey === "base"}
          onCopy={() => void copyValue("base", cdnBaseUrl)}
        />
        <UsageCopyBlock
          label="HTML"
          value={htmlSnippet}
          copied={copiedKey === "html"}
          onCopy={() => void copyValue("html", htmlSnippet)}
          monospace
        />
        <UsageCopyBlock
          label="CSS mask (색상 변경)"
          value={cssSnippet}
          copied={copiedKey === "css"}
          onCopy={() => void copyValue("css", cssSnippet)}
          monospace
        />
      </div>
    </div>
  );
}

function UsageCopyBlock({
  label,
  value,
  copied,
  onCopy,
  monospace = false,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  monospace?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-xl border border-[color:var(--icons-line)] px-3 py-3 text-left transition hover:border-[color:var(--icons-cyan)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <span className="text-[10px] font-semibold uppercase text-[color:var(--icons-cyan)]">
          {copied ? "복사됨" : "복사"}
        </span>
      </div>
      <code
        className={`mt-2 block max-h-20 overflow-hidden break-all text-[11px] text-[color:var(--icons-ink-soft)] ${
          monospace ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value}
      </code>
    </button>
  );
}
