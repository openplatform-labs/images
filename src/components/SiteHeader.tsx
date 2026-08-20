"use client";

import Link from "next/link";
import { getGithubRepoUrl } from "@/lib/config";
import { SiteThemeToggle } from "@/components/SiteThemeToggle";
import { isGlyphFoundryChannel, type ChannelId } from "@/lib/channel";

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.205 0 1.59-.015 2.865-.015 3.255 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface SiteHeaderProps {
  brandName?: string;
  channelId?: ChannelId;
}

export function SiteHeader({
  brandName = "SVG LOGOS",
  channelId = "logos",
}: SiteHeaderProps) {
  const isImages = channelId === "images";
  const isIllust = channelId === "illust";
  const isAvatars = channelId === "avatars";
  const isIcons = isGlyphFoundryChannel(channelId);
  const hideSiteThemeToggle = isImages || isAvatars || isIcons;

  const brandClass = isImages
    ? "font-display text-lg font-bold uppercase tracking-[0.22em] text-white md:text-xl"
    : isIllust
      ? "font-display text-2xl font-semibold tracking-tight text-[color:var(--illust-ink)]"
      : isAvatars
        ? "font-display text-lg font-bold uppercase tracking-[0.28em] text-[color:var(--avatars-ink)] md:text-xl"
        : isIcons
          ? "font-display text-lg font-bold uppercase tracking-[0.28em] text-[color:var(--icons-ink)] md:text-xl"
          : "font-display text-xl font-bold tracking-tight";

  const headerClass = isImages
    ? "site-header-shell fixed inset-x-0 top-0 z-50 border-transparent bg-gradient-to-b from-black/80 via-black/35 to-transparent"
    : isAvatars
      ? "site-header-shell sticky top-0 z-50 border-b border-[color:var(--avatars-line)]"
      : isIcons
        ? "site-header-shell sticky top-0 z-50 border-b border-[color:var(--icons-line)]"
        : isIllust
          ? "site-header-shell sticky top-0 z-50 border-b"
          : "site-header-shell sticky top-0 z-50 border-b border-border/80";

  return (
    <header className={headerClass}>
      <div
        className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-6 ${
          isIllust || isAvatars || isIcons ? "max-w-[1500px] md:px-10" : "max-w-7xl"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className={brandClass}>{brandName}</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {!hideSiteThemeToggle && <SiteThemeToggle />}
          <a
            href={getGithubRepoUrl(channelId)}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 border px-3 py-2 transition ${
              isImages
                ? "rounded-lg border-white/25 text-white/75 hover:border-white/60 hover:text-white"
                : isIllust
                  ? "rounded-full border-[color:var(--illust-line)] text-muted hover:border-[color:var(--illust-seal)] hover:text-[color:var(--illust-ink)]"
                  : isAvatars
                    ? "rounded-full border-[color:var(--avatars-line)] text-muted hover:border-[color:var(--avatars-lime)] hover:text-[color:var(--avatars-ink)]"
                    : isIcons
                      ? "rounded-full border-[color:var(--icons-line)] text-muted hover:border-[color:var(--icons-cyan)] hover:text-[color:var(--icons-ink)]"
                      : "rounded-lg border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            <GithubIcon />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
