import { slugify } from "./slug";

/** 파일명에서 shortname·표시명 추론 */
export function inferLogoMetaFromFilename(filename: string): {
  shortname: string;
  name: string;
  suggestedFilename: string;
} {
  const baseName = filename.replace(/\.(svg|png|jpe?g|webp|gif)$/i, "");
  const normalized = baseName
    .replace(/-icon-dark$/i, "")
    .replace(/-dark$/i, "")
    .replace(/-icon$/i, "")
    .replace(/-vertical$/i, "")
    .replace(/-alt$/i, "");

  const shortname = slugify(normalized) || slugify(baseName) || "logo";
  const name = normalized
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    shortname,
    name: name || baseName,
    suggestedFilename: `${shortname}${baseName.includes("-icon") ? "-icon" : ""}.svg`,
  };
}

/** 병합 시 소스 파일명을 타깃 shortname 규칙으로 재매핑 */
export function remapMergedFilename(
  originalFilename: string,
  sourceShortname: string,
  targetShortname: string,
  usedLowerNames: Set<string>,
): string {
  const extensionMatch = originalFilename.match(/\.[^.]+$/);
  const extension = extensionMatch?.[0] ?? ".svg";
  const originalLower = originalFilename.toLowerCase();
  const sourceLower = sourceShortname.toLowerCase();
  const targetLower = targetShortname.toLowerCase();

  let candidate: string;
  if (
    originalLower === `${sourceLower}${extension}` ||
    originalLower === `${sourceLower}.svg`
  ) {
    candidate = `${targetShortname}${extension}`;
  } else if (originalLower.startsWith(`${sourceLower}-`)) {
    candidate = `${targetShortname}${originalFilename.slice(sourceShortname.length)}`;
  } else if (
    originalLower === `${targetLower}${extension}` ||
    originalLower.startsWith(`${targetLower}-`)
  ) {
    candidate = originalFilename;
  } else {
    const stem = originalFilename.replace(/\.[^.]+$/, "");
    candidate = `${targetShortname}-${stem}${extension}`;
  }

  if (!usedLowerNames.has(candidate.toLowerCase())) {
    usedLowerNames.add(candidate.toLowerCase());
    return candidate;
  }

  let index = 2;
  while (
    usedLowerNames.has(`${targetShortname}-${index}${extension}`.toLowerCase())
  ) {
    index += 1;
  }
  const unique = `${targetShortname}-${index}${extension}`;
  usedLowerNames.add(unique.toLowerCase());
  return unique;
}

/** 업로드 파일명을 저장소 규칙에 맞게 정규화 */
export function normalizeSvgFilename(
  originalName: string,
  shortname: string,
  index: number,
): string {
  const lower = originalName.toLowerCase();
  if (lower.endsWith("-icon.svg")) return `${shortname}-icon.svg`;
  if (lower.endsWith("-dark.svg")) return `${shortname}-dark.svg`;
  if (lower.endsWith("-icon-dark.svg")) return `${shortname}-icon-dark.svg`;
  if (index === 0 && !lower.includes("-icon")) return `${shortname}.svg`;
  if (index > 0 && lower.includes("icon")) return `${shortname}-icon.svg`;
  return `${shortname}-${index + 1}.svg`;
}

/** 래스터/일반 자산 파일명 정규화 */
export function normalizeAssetFilename(
  originalName: string,
  shortname: string,
  index: number,
): string {
  const lower = originalName.toLowerCase();
  const extensionMatch = lower.match(/\.(svg|png|jpe?g|webp|gif)$/);
  const extension = (extensionMatch?.[1] ?? "png").replace("jpeg", "jpg");
  if (lower.endsWith(".svg")) {
    return normalizeSvgFilename(originalName, shortname, index);
  }
  if (index === 0) return `${shortname}.${extension}`;
  return `${shortname}-${index + 1}.${extension}`;
}
