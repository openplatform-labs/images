export type ChannelId =
  | "logos"
  | "images"
  | "illust"
  | "icons"
  | "avatars"
  | "pictograms";

/** 갤러리 1차 그룹 방식 */
export type GalleryGroupBy = "collection" | "source" | "none";

export interface ChannelConfig {
  id: ChannelId;
  /** 공개 사이트 기본 URL */
  siteBaseUrl: string;
  /** Host 매칭 (소문자, 포트 제외) */
  hosts: string[];
  /** GitHub/CDN 자산 디렉터리 */
  assetDir: string;
  /** 카탈로그 JSON 파일명 */
  catalogFile: string;
  /** 상세 페이지 경로 prefix */
  detailPathPrefix: string;
  /** UI 브랜드명 */
  brandName: string;
  /** 메타 title */
  metaTitle: string;
  /** 상세 페이지 배지 */
  badgeLabel: string;
  /** 갤러리 히어로 제목 */
  heroTitle: string;
  /** 갤러리 히어로 설명 */
  heroDescription: string;
  /** 갤러리 1차 그룹 (logos=collection, icons=source/package) */
  galleryGroupBy: GalleryGroupBy;
  /** 허용 확장자 */
  allowedExtensions: string[];
  /** 빈 결과 문구 */
  emptyLabel: string;
  /** 영문 단수 */
  itemLabel: string;
  /** 영문 복수 */
  itemLabelPlural: string;
  /** 한글 단수 */
  itemLabelKo: string;
  /** 검색 placeholder */
  searchPlaceholder: string;
  /** 이름 입력 placeholder */
  namePlaceholder: string;
  /** 관리자 사이드 설명 */
  adminNavDescription: string;
  /** 콘텐츠 관리 부제 */
  contentsSubtitle: string;
  /** 기존 목록 탭 */
  manageTabLabel: string;
  /** 업로드 탭 */
  uploadTabLabel: string;
  /** 업로드 섹션 제목 */
  uploadSectionTitle: string;
  /** 업로드 안내 */
  uploadHint: string;
  /** 동기화 버튼 */
  syncButtonLabel: string;
  /** 기존 목록 제목 */
  existingTitle: string;
  /** 기존 목록 안내 */
  existingHint: string;
  /** 편집 제목 */
  editTitle: string;
  /** 드롭존 안내 */
  dropzoneHint: string;
  /** 파일 미선택 시 */
  fileRequiredMessage: string;
  /** 기존 항목에 변형 파일 추가 제목 */
  fileAddTitle: string;
  /** 기존 항목에 변형 파일 추가 안내 */
  fileAddHint: string;
}

const logosChannel: ChannelConfig = {
  id: "logos",
  siteBaseUrl: "https://logos.opl.io.kr",
  hosts: ["logos.opl.io.kr", "logo.opl.io.kr", "localhost", "127.0.0.1"],
  assetDir: "logos",
  catalogFile: "logos.json",
  detailPathPrefix: "/logo",
  brandName: "SVG LOGOS",
  metaTitle: "OpenSphere Logos — SVG Logo Gallery",
  badgeLabel: "LOGO",
  heroTitle: "SVG LOGOS",
  heroDescription:
    "Vector logos for developers, designers, and teams. Curated SVGs via Statically CDN.",
  galleryGroupBy: "collection",
  allowedExtensions: [".svg"],
  emptyLabel: "No logos found.",
  itemLabel: "logo",
  itemLabelPlural: "logos",
  itemLabelKo: "로고",
  searchPlaceholder: "react, vite, docker...",
  namePlaceholder: "브랜드명",
  adminNavDescription: "로고 · 카테고리 · 태그 · 편집",
  contentsSubtitle: "로고 업로드 · 기존 로고 편집 · 카테고리 · 태그",
  manageTabLabel: "기존 로고 관리",
  uploadTabLabel: "새 로고 업로드",
  uploadSectionTitle: "로고 업로드",
  uploadHint: "PC에서 SVG를 로드하거나 SVG 코드를 붙여넣으면 GitHub + CDN까지 자동 배포됩니다.",
  syncButtonLabel: "logos.json 동기화",
  existingTitle: "기존 로고",
  existingHint: "등록된 로고를 검색하고 선택해 편집합니다.",
  editTitle: "로고 편집",
  dropzoneHint: "PC에서 SVG 파일을 여기에 놓으세요",
  fileRequiredMessage: "SVG 파일 또는 SVG 코드를 먼저 추가하세요.",
  fileAddTitle: "SVG 파일 추가",
  fileAddHint:
    "SVG 코드를 붙여넣거나 파일을 올린 뒤 저장하면 GitHub·DB에 한 번에 반영됩니다.",
};

const imagesChannel: ChannelConfig = {
  id: "images",
  siteBaseUrl: "https://images.opl.io.kr",
  hosts: ["images.opl.io.kr"],
  assetDir: "images",
  catalogFile: "images.json",
  detailPathPrefix: "/image",
  brandName: "IMAGES",
  metaTitle: "OpenSphere Images — Image CDN",
  badgeLabel: "IMAGE",
  heroTitle: "IMAGES",
  heroDescription:
    "Curated images for products, stories, and creative work — delivered via Statically CDN.",
  galleryGroupBy: "none",
  allowedExtensions: [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"],
  emptyLabel: "No images found.",
  itemLabel: "image",
  itemLabelPlural: "images",
  itemLabelKo: "이미지",
  searchPlaceholder: "space, city, nature...",
  namePlaceholder: "이미지명",
  adminNavDescription: "이미지 · 카테고리 · 태그 · 편집",
  contentsSubtitle: "이미지 업로드 · 기존 이미지 편집 · 카테고리 · 태그",
  manageTabLabel: "기존 이미지 관리",
  uploadTabLabel: "새 이미지 업로드",
  uploadSectionTitle: "이미지 업로드",
  uploadHint: "PC에서 이미지를 로드하면 GitHub + CDN까지 자동 배포됩니다.",
  syncButtonLabel: "images.json 동기화",
  existingTitle: "기존 이미지",
  existingHint: "등록된 이미지를 검색하고 선택해 편집합니다.",
  editTitle: "이미지 편집",
  dropzoneHint: "PC에서 이미지 파일을 여기에 놓으세요",
  fileRequiredMessage: "이미지 파일을 먼저 로드하세요.",
  fileAddTitle: "이미지 파일 추가",
  fileAddHint: "기존 shortname에 이미지를 추가하면 GitHub에 병합됩니다.",
};

const illustChannel: ChannelConfig = {
  id: "illust",
  siteBaseUrl: "https://illust.opl.io.kr",
  hosts: ["illust.opl.io.kr"],
  assetDir: "illust",
  catalogFile: "illust.json",
  detailPathPrefix: "/illust",
  brandName: "ILLUST",
  metaTitle: "OpenSphere Illust — Illustration CDN",
  badgeLabel: "ILLUST",
  heroTitle: "ILLUST",
  heroDescription:
    "Illustration atelier for products, decks, and stories — absolute CDN URLs ready to paste.",
  galleryGroupBy: "none",
  allowedExtensions: [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"],
  emptyLabel: "No illustrations found.",
  itemLabel: "illustration",
  itemLabelPlural: "illustrations",
  itemLabelKo: "일러스트",
  searchPlaceholder: "character, icon, pattern...",
  namePlaceholder: "일러스트명",
  adminNavDescription: "일러스트 · 카테고리 · 태그 · 편집",
  contentsSubtitle: "일러스트 업로드 · 기존 일러스트 편집 · 카테고리 · 태그",
  manageTabLabel: "기존 일러스트 관리",
  uploadTabLabel: "새 일러스트 업로드",
  uploadSectionTitle: "일러스트 업로드",
  uploadHint: "PC에서 일러스트를 로드하면 GitHub + CDN까지 자동 배포됩니다.",
  syncButtonLabel: "illust.json 동기화",
  existingTitle: "기존 일러스트",
  existingHint: "등록된 일러스트를 검색하고 선택해 편집합니다.",
  editTitle: "일러스트 편집",
  dropzoneHint: "PC에서 일러스트 파일을 여기에 놓으세요",
  fileRequiredMessage: "일러스트 파일을 먼저 로드하세요.",
  fileAddTitle: "일러스트 파일 추가",
  fileAddHint: "기존 shortname에 일러스트를 추가하면 GitHub에 병합됩니다.",
};

const iconsChannel: ChannelConfig = {
  id: "icons",
  siteBaseUrl: "https://icons.opl.io.kr",
  hosts: ["icons.opl.io.kr"],
  assetDir: "icons",
  catalogFile: "icons.json",
  detailPathPrefix: "/icon",
  brandName: "ICONS",
  metaTitle: "OpenSphere Icons — Icon Pack CDN",
  badgeLabel: "ICON",
  heroTitle: "ICON PACKS",
  heroDescription:
    "Icon bundles for products and UI — Carbon and your own packs, with absolute CDN URLs.",
  galleryGroupBy: "source",
  allowedExtensions: [".svg"],
  emptyLabel: "No packs on the shelf.",
  itemLabel: "icon",
  itemLabelPlural: "icons",
  itemLabelKo: "아이콘",
  searchPlaceholder: "home, add, search — 모든 묶음에서 검색",
  namePlaceholder: "아이콘명",
  adminNavDescription: "묶음 · 아이콘 · 카테고리 · 태그",
  contentsSubtitle: "묶음 단위 아이콘 업로드 · 편집 · 카테고리 · 태그",
  manageTabLabel: "기존 아이콘 관리",
  uploadTabLabel: "새 아이콘 업로드",
  uploadSectionTitle: "아이콘 업로드",
  uploadHint:
    "묶음 slug를 정한 뒤 SVG를 올리면 icons/{pack}/ 경로로 GitHub + CDN에 배포됩니다. 예: IBM Carbon → carbon",
  syncButtonLabel: "icons.json 동기화",
  existingTitle: "기존 아이콘",
  existingHint: "묶음별로 등록된 아이콘을 검색하고 선택해 편집합니다.",
  editTitle: "아이콘 편집",
  dropzoneHint: "PC에서 SVG 아이콘을 여기에 놓으세요",
  fileRequiredMessage: "SVG 파일 또는 SVG 코드를 먼저 추가하세요.",
  fileAddTitle: "아이콘 파일 추가",
  fileAddHint: "파일 또는 SVG 코드로 기존 shortname에 같은 묶음 경로로 병합합니다.",
};

const pictogramsChannel: ChannelConfig = {
  id: "pictograms",
  siteBaseUrl: "https://pictograms.opl.io.kr",
  hosts: ["pictograms.opl.io.kr"],
  assetDir: "pictograms",
  catalogFile: "pictograms.json",
  detailPathPrefix: "/pictogram",
  brandName: "PICTOGRAMS",
  metaTitle: "OpenSphere Pictograms — Pictogram CDN",
  badgeLabel: "PICTOGRAM",
  heroTitle: "PICTOGRAMS",
  heroDescription:
    "IBM Carbon pictograms at working size — categories, individual view, absolute CDN URLs.",
  galleryGroupBy: "none",
  allowedExtensions: [".svg"],
  emptyLabel: "No pictograms in the library.",
  itemLabel: "pictogram",
  itemLabelPlural: "pictograms",
  itemLabelKo: "픽토그램",
  searchPlaceholder: "airplane, cloud, watson...",
  namePlaceholder: "픽토그램명",
  adminNavDescription: "픽토그램 · 카테고리 · 태그",
  contentsSubtitle: "픽토그램 업로드 · 기존 항목 편집 · 카테고리 · 태그",
  manageTabLabel: "기존 픽토그램 관리",
  uploadTabLabel: "새 픽토그램 업로드",
  uploadSectionTitle: "픽토그램 업로드",
  uploadHint:
    "SVG를 올리면 pictograms/ 경로로 GitHub + CDN에 배포됩니다. 아이콘 묶음은 icons.opl.io.kr 입니다.",
  syncButtonLabel: "pictograms.json 동기화",
  existingTitle: "기존 픽토그램",
  existingHint: "등록된 픽토그램을 검색하고 선택해 편집합니다.",
  editTitle: "픽토그램 편집",
  dropzoneHint: "PC에서 SVG 픽토그램을 여기에 놓으세요",
  fileRequiredMessage: "SVG 파일 또는 SVG 코드를 먼저 추가하세요.",
  fileAddTitle: "픽토그램 파일 추가",
  fileAddHint: "파일 또는 SVG 코드로 기존 shortname에 병합합니다.",
};

const avatarsChannel: ChannelConfig = {
  id: "avatars",
  siteBaseUrl: "https://avatars.opl.io.kr",
  hosts: ["avatars.opl.io.kr"],
  assetDir: "avatars",
  catalogFile: "avatars.json",
  detailPathPrefix: "/avatar",
  brandName: "AVATARS",
  metaTitle: "OpenSphere Avatars — Avatar CDN",
  badgeLabel: "AVATAR",
  heroTitle: "AVATARS",
  heroDescription:
    "Profile faces for products, chats, and identity systems — circular crops, absolute CDN URLs.",
  galleryGroupBy: "none",
  allowedExtensions: [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"],
  emptyLabel: "No avatars in the roster.",
  itemLabel: "avatar",
  itemLabelPlural: "avatars",
  itemLabelKo: "아바타",
  searchPlaceholder: "person, mascot, initial...",
  namePlaceholder: "아바타명",
  adminNavDescription: "아바타 · 카테고리 · 태그 · 편집",
  contentsSubtitle: "아바타 업로드 · 기존 아바타 편집 · 카테고리 · 태그",
  manageTabLabel: "기존 아바타 관리",
  uploadTabLabel: "새 아바타 업로드",
  uploadSectionTitle: "아바타 업로드",
  uploadHint:
    "정사각 PNG/SVG를 올리면 GitHub + CDN까지 자동 배포됩니다. 프로필에 바로 쓸 원형 크롭 미리보기를 제공합니다.",
  syncButtonLabel: "avatars.json 동기화",
  existingTitle: "기존 아바타",
  existingHint: "등록된 아바타를 검색하고 선택해 편집합니다.",
  editTitle: "아바타 편집",
  dropzoneHint: "PC에서 아바타 이미지를 여기에 놓으세요",
  fileRequiredMessage: "아바타 파일을 먼저 로드하세요.",
  fileAddTitle: "아바타 파일 추가",
  fileAddHint: "기존 shortname에 이미지를 추가하면 GitHub에 병합됩니다.",
};

export const channels: Record<ChannelId, ChannelConfig> = {
  logos: logosChannel,
  images: imagesChannel,
  illust: illustChannel,
  icons: iconsChannel,
  avatars: avatarsChannel,
  pictograms: pictogramsChannel,
};

const channelIdSet = new Set<string>(Object.keys(channels));

export function isChannelId(value: string | null | undefined): value is ChannelId {
  return Boolean(value && channelIdSet.has(value));
}

/** 아이콘·픽토그램 파운드리 채널 */
export function isGlyphFoundryChannel(
  channelId: ChannelId | null | undefined,
): boolean {
  return channelId === "icons" || channelId === "pictograms";
}

/** Host 헤더에서 채널 결정 */
export function resolveChannelFromHost(hostHeader: string | null): ChannelId {
  const host = (hostHeader ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();

  if (!host) return "logos";

  for (const channel of Object.values(channels)) {
    if (channel.hosts.includes(host)) return channel.id;
  }

  return "logos";
}

export function getChannelConfig(channelId: ChannelId): ChannelConfig {
  return channels[channelId];
}

/** 브라우저 Host에서 채널 설정 (클라이언트용) */
export function getBrowserChannelConfig(): ChannelConfig {
  if (typeof window === "undefined") return channels.logos;
  return getChannelConfig(resolveChannelFromHost(window.location.host));
}

export interface ChannelGithub {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
}

const DEFAULT_GITHUB_OWNER = "openplatform-labs";
const DEFAULT_GITHUB_BRANCH = "main";

function githubRepoEnvKey(channelId: ChannelId): string {
  return `GITHUB_REPO_${channelId.toUpperCase()}`;
}

/** 채널 이름과 같은 GitHub 자산 레포 */
export function getChannelGithub(channelId: ChannelId): ChannelGithub {
  const owner = process.env.GITHUB_OWNER ?? DEFAULT_GITHUB_OWNER;
  const repo = process.env[githubRepoEnvKey(channelId)] ?? channelId;
  const branch = process.env.GITHUB_BRANCH ?? DEFAULT_GITHUB_BRANCH;
  return { owner, repo, branch };
}

export function getChannelGithubUrl(channelId: ChannelId): string {
  const { owner, repo } = getChannelGithub(channelId);
  return `https://github.com/${owner}/${repo}`;
}

export function getChannelCdnBase(channelId: ChannelId): string {
  const overrideKey = `STATICALLY_CDN_BASE_${channelId.toUpperCase()}`;
  const override = process.env[overrideKey];
  if (override) return override.replace(/\/$/, "");
  const { owner, repo, branch } = getChannelGithub(channelId);
  return `https://cdn.statically.io/gh/${owner}/${repo}@${branch}`;
}

/** 카탈로그 JSON raw URL */
export function getCatalogRemoteUrl(channelId: ChannelId): string {
  const channel = getChannelConfig(channelId);
  const { owner, repo, branch } = getChannelGithub(channelId);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${channel.catalogFile}`;
}

/** 아이콘 GitHub/CDN 상대 경로 (패키지 하위) */
export function buildIconAssetPath(packageSlug: string, filename: string): string {
  const safePackage = packageSlug.replace(/^\/+|\/+$/g, "");
  const safeFilename = filename.replace(/^\/+/, "").split("/").pop() ?? filename;
  return `${safePackage}/${safeFilename}`;
}
