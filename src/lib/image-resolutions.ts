import type { ImageResolutionVariant, LogoFile, LogoVariant } from "./types";

export const imageResolutionOrder: ImageResolutionVariant[] = [
  "orig",
  "large",
  "medium",
  "small",
  "thumb",
];

export const imageResolutionLabels: Record<ImageResolutionVariant, string> = {
  orig: "Original",
  large: "Large",
  medium: "Medium",
  small: "Small",
  thumb: "Thumb",
};

export const imageResolutionHints: Record<ImageResolutionVariant, string> = {
  orig: "최고 해상도 · 실사용/인쇄",
  large: "고해상도 · 히어로·배너",
  medium: "웹 본문 · 기본",
  small: "카드 · 목록",
  thumb: "썸네일",
};

export function isImageResolutionVariant(
  value: string,
): value is ImageResolutionVariant {
  return imageResolutionOrder.includes(value as ImageResolutionVariant);
}

/** 이미지 해상도 파일만 정렬해 반환 */
export function listImageResolutionFiles(files: LogoFile[]): LogoFile[] {
  const byRole = new Map<LogoVariant, LogoFile>();
  for (const file of files) {
    if (isImageResolutionVariant(file.role)) {
      byRole.set(file.role, file);
    }
  }

  const ordered: LogoFile[] = [];
  for (const role of imageResolutionOrder) {
    const file = byRole.get(role);
    if (file) ordered.push(file);
  }

  // 해상도 메타가 없으면 기존 파일 그대로
  if (ordered.length === 0) return files;
  return ordered;
}

export function pickDefaultImageResolution(
  files: LogoFile[],
): LogoFile | null {
  const ordered = listImageResolutionFiles(files);
  if (ordered.length === 0) return files[0] ?? null;

  const preferred: ImageResolutionVariant[] = [
    "medium",
    "large",
    "orig",
    "small",
    "thumb",
  ];
  for (const role of preferred) {
    const match = ordered.find((file) => file.role === role);
    if (match) return match;
  }
  return ordered[0];
}

/** 보유 해상도 중 가장 큰 파일 (orig → large → …) */
export function pickLargestImageResolution(
  files: LogoFile[],
): LogoFile | null {
  const ordered = listImageResolutionFiles(files);
  if (ordered.length === 0) return files[0] ?? null;
  return ordered[0];
}

/** 픽셀 면적·용량 기준 최대 파일 (히어로용) */
export function pickLargestByPixels(files: LogoFile[]): LogoFile | null {
  if (files.length === 0) return null;

  const scored = [...files].sort((left, right) => {
    const areaLeft = (left.width ?? 0) * (left.height ?? 0);
    const areaRight = (right.width ?? 0) * (right.height ?? 0);
    if (areaRight !== areaLeft) return areaRight - areaLeft;
    return (right.bytes ?? 0) - (left.bytes ?? 0);
  });

  if ((scored[0].width ?? 0) > 0 || (scored[0].bytes ?? 0) > 0) {
    return scored[0];
  }

  return pickLargestImageResolution(files);
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(
  width?: number | null,
  height?: number | null,
): string {
  if (!width || !height) return "";
  return `${width}×${height}`;
}
