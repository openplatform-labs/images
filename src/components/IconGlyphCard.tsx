"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { toAbsoluteCdnUrl } from "@/lib/statically";
import type { ChannelId } from "@/lib/channel";

interface IconGlyphCardProps {
  name: string;
  shortname: string;
  href: string;
  imageUrl: string | null;
  packLabel?: string;
  size?: "icon" | "pictogram";
  channelId?: ChannelId;
}

/** 셀 클릭은 개별 보기, 복사 버튼은 CDN URL */
export function IconGlyphCard({
  name,
  shortname,
  href,
  imageUrl,
  size = "icon",
  channelId = "icons",
}: IconGlyphCardProps) {
  const [copied, setCopied] = useState(false);
  const cdnUrl = imageUrl ? toAbsoluteCdnUrl(imageUrl, channelId) : "";

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!cdnUrl) return;
    try {
      await navigator.clipboard.writeText(cdnUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // 클립보드 권한이 없으면 상세에서 복사
    }
  }

  const glyphSize = size === "pictogram" ? 96 : 48;

  return (
    <article
      className={`icons-library-cell ${
        size === "pictogram" ? "icons-library-cell--pictogram" : ""
      }`}
    >
      <Link
        href={href}
        className="icons-library-cell-hit"
        aria-label={`${name} 개별 보기`}
        title="개별 보기"
      >
        <span className="icons-library-cell-name">{name}</span>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={glyphSize}
            height={glyphSize}
            loading="lazy"
            className={`icons-library-glyph ${
              size === "pictogram" ? "icons-library-glyph--pictogram" : ""
            }`}
          />
        ) : (
          <span className="icons-library-glyph-empty">—</span>
        )}
      </Link>
      {cdnUrl ? (
        <button
          type="button"
          onClick={handleCopy}
          className={`icons-library-copy ${copied ? "is-copied" : ""}`}
          aria-label={`${name} CDN 주소 복사`}
          title="CDN URL 복사"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      ) : null}
    </article>
  );
}
