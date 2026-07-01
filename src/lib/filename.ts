import { slugify } from "./slug";

/** 파일명에서 shortname·표시명 추론 */
export function inferLogoMetaFromFilename(filename: string): {
  shortname: string;
  name: string;
  suggestedFilename: string;
} {
  const baseName = filename.replace(/\.svg$/i, "");
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
