export type ChannelId =
  | "logos"
  | "images"
  | "illust"
  | "icons"
  | "avatars"
  | "pictograms";

export type LogoCollection = "simple" | "themed";

export type SimpleVariant = "default" | "icon";

export type ThemedVariant =
  | "default"
  | "mono"
  | "light"
  | "dark"
  | "color"
  | "wordmark"
  | "wordmarkLight"
  | "wordmarkDark"
  | "icon"
  | "size16"
  | "size32"
  | "size64"
  | "line";

/** 이미지 채널 해상도 variant */
export type ImageResolutionVariant =
  | "thumb"
  | "small"
  | "medium"
  | "large"
  | "orig";

export type LogoVariant =
  | SimpleVariant
  | ThemedVariant
  | ImageResolutionVariant;

export interface LogoFile {
  filename: string;
  staticallyUrl: string;
  role: LogoVariant;
  format: "svg" | "raster";
  scalable: boolean;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
}

/** 아이콘 묶음(팩) 갤러리 카드 */
export interface IconPackPreview {
  slug: string;
  label: string;
  count: number;
  previews: {
    shortname: string;
    name: string;
    imageUrl: string;
  }[];
}

export interface LogoEntry {
  shortname: string;
  name: string;
  url: string | null;
  channel: ChannelId;
  collection: LogoCollection;
  source: string | null;
  /** 기본 미리보기 파일명 (없으면 자동 선택) */
  previewFilename: string | null;
  files: LogoFile[];
  categories: Category[];
  tags: Tag[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  logoCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  logoCount?: number;
}

/** 이미지 홈 히어로 로테이션 후보 */
export interface ImageHeroCandidate {
  shortname: string;
  name: string;
  href: string;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface LogosJsonFileEntry {
  filename: string;
  variant: LogoVariant;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface LogosJsonEntry {
  name: string;
  shortname: string;
  url: string;
  collection?: LogoCollection;
  source?: string;
  /** 갤러리·카드 기본 미리보기로 쓸 파일명 */
  previewFilename?: string;
  files: LogosJsonFileEntry[] | string[];
}

export interface LogoListResult {
  items: LogoEntry[];
  total: number;
  page: number;
  pageSize: number;
}
