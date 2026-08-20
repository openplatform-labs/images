import type { ChannelId } from "./channel";
import type { SiteTheme } from "./preview-theme";

/** 채널별 갤러리 레이아웃 */
export type GalleryLayout = "toolkit" | "cinema" | "studio" | "glyph" | "roster";

export interface ChannelThemeMeta {
  /** 기본 사이트 테마 */
  defaultSiteTheme: SiteTheme;
  /** 갤러리 레이아웃 키 */
  galleryLayout: GalleryLayout;
  /** 히어로 보조 라벨 */
  heroEyebrow: string;
  /** 히어로 짧은 태그라인 */
  heroTagline: string;
}

export const channelThemes: Record<ChannelId, ChannelThemeMeta> = {
  logos: {
    defaultSiteTheme: "light",
    galleryLayout: "toolkit",
    heroEyebrow: "Brand toolkit",
    heroTagline: "검색하고, 고르고, CDN URL을 바로 복사하세요.",
  },
  images: {
    defaultSiteTheme: "dark",
    galleryLayout: "cinema",
    heroEyebrow: "Image library",
    heroTagline: "모든 이미지를 담고, 고해상도 CDN URL로 바로 쓰세요.",
  },
  illust: {
    defaultSiteTheme: "light",
    galleryLayout: "studio",
    heroEyebrow: "Illustration atelier",
    heroTagline: "작품을 벽에 걸고, CDN 절대경로로 바로 쓰세요.",
  },
  icons: {
    defaultSiteTheme: "dark",
    galleryLayout: "glyph",
    heroEyebrow: "Glyph foundry",
    heroTagline: "묶음으로 고르고, 검색은 모든 팩에서 한 번에.",
  },
  pictograms: {
    defaultSiteTheme: "dark",
    galleryLayout: "glyph",
    heroEyebrow: "Pictogram foundry",
    heroTagline: "카테고리로 고르고, 픽토그램은 아이콘보다 크게.",
  },
  avatars: {
    defaultSiteTheme: "dark",
    galleryLayout: "roster",
    heroEyebrow: "Identity roster",
    heroTagline: "얼굴을 고르고, 원형 크롭 CDN URL로 바로 쓰세요.",
  },
};

export function getChannelTheme(channelId: ChannelId): ChannelThemeMeta {
  return channelThemes[channelId];
}
