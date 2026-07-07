"use client";

import { useState } from "react";
import { LogoImage } from "./LogoImage";
import { LogoPreviewFrame } from "./LogoPreviewFrame";

interface CopyableLogoPreviewProps {
  src: string;
  alt: string;
  copyValue: string;
}

export function CopyableLogoPreview({
  src,
  alt,
  copyValue,
}: CopyableLogoPreviewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(copyValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="클릭하면 이 URL이 복사됩니다"
      className="group relative block w-full cursor-pointer overflow-hidden rounded-lg ring-accent/40 transition hover:ring-2 focus:outline-none focus:ring-2"
    >
      <LogoPreviewFrame className="rounded-lg">
        <LogoImage src={src} alt={alt} size="variant" />
      </LogoPreviewFrame>

      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-semibold transition ${
          copied
            ? "bg-accent text-background opacity-100"
            : "bg-foreground/70 text-background opacity-0 group-hover:opacity-100"
        }`}
      >
        {copied ? "복사됨!" : "클릭하여 URL 복사"}
      </span>
    </button>
  );
}
