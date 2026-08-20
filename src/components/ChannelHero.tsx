import type { ChannelId } from "@/lib/channel";
import { getChannelTheme } from "@/lib/channel-theme";

interface ChannelHeroProps {
  channelId: ChannelId;
  title: string;
  description: string;
  total: number;
}

export function ChannelHero({
  channelId,
  title,
  description,
  total,
}: ChannelHeroProps) {
  const theme = getChannelTheme(channelId);

  if (channelId === "images") {
    return null;
  }

  // illust / avatars / icons: 전용 홈에서 히어로 구성
  if (channelId === "illust" || channelId === "avatars" || channelId === "icons") {
    return null;
  }

  // logos — 좌측 정렬 에디토리얼 툴킷
  return (
    <section className="mb-8 border-b border-border pb-8 md:mb-12 md:pb-10">
      <div className="animate-fade-up grid gap-6 md:grid-cols-[1.4fr_0.6fr] md:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            {theme.heroEyebrow}
          </p>
          <h1 className="channel-hero-title font-display mt-2 text-3xl font-extrabold md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted md:text-base">
            {theme.heroTagline}
          </p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="justify-self-start border border-border bg-surface px-4 py-3 font-mono text-xs text-muted md:justify-self-end">
          <p className="text-foreground">{total.toLocaleString()}</p>
          <p>assets · Statically CDN</p>
        </div>
      </div>
    </section>
  );
}
