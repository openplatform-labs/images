import type { LogoCollection, LogoVariant, LogosJsonFileEntry } from "./types";

const themedFilenamePattern =
  /-(light|dark|color|wordmark|wordmarklight|wordmarkdark|mono|16|32|64|line|horizontal|lockup|octocat)\.svg$/i;

/** 파일명·컬렉션으로 variant 추론 */
export function inferVariantFromFilename(
  filename: string,
  shortname: string,
  collection: LogoCollection,
): LogoVariant {
  const lower = filename.toLowerCase();
  const base = `${shortname}.svg`;

  if (collection === "simple") {
    if (lower === base) return "default";
    if (lower.endsWith("-icon.svg")) return "icon";
    return "default";
  }

  // themed (thesvg)
  if (lower === base) return "default";
  if (lower.endsWith("-color.svg")) return "color";
  if (lower.endsWith("-light.svg")) return "light";
  if (lower.endsWith("-dark.svg")) return "dark";
  if (lower.endsWith("-wordmarklight.svg")) return "wordmarkLight";
  if (lower.endsWith("-wordmarkdark.svg")) return "wordmarkDark";
  if (lower.endsWith("-wordmark.svg")) return "wordmark";
  if (lower.endsWith("-icon.svg")) return "mono";
  if (lower.endsWith("-mono.svg")) return "mono";
  if (lower.endsWith("-16.svg")) return "size16";
  if (lower.endsWith("-32.svg")) return "size32";
  if (lower.endsWith("-64.svg")) return "size64";
  if (lower.endsWith("-line.svg")) return "line";
  return "default";
}

/** 파일 목록으로 컬렉션 판별 */
export function detectCollection(
  filenames: string[],
  shortname: string,
  source?: string,
): LogoCollection {
  if (source === "thesvg") return "themed";
  if (source === "gilbarbara") return "simple";

  const hasThemedFile = filenames.some(
    (filename) =>
      themedFilenamePattern.test(filename) ||
      (filename !== `${shortname}.svg` &&
        !filename.endsWith("-icon.svg") &&
        filename.startsWith(`${shortname}-`)),
  );

  return hasThemedFile ? "themed" : "simple";
}

/** logos.json files 필드 정규화 */
export function normalizeLogosJsonFiles(
  files: LogosJsonFileEntry[] | string[],
  shortname: string,
  collection: LogoCollection,
): LogosJsonFileEntry[] {
  return files.map((file) => {
    if (typeof file === "string") {
      return {
        filename: file,
        variant: inferVariantFromFilename(file, shortname, collection),
      };
    }
    return {
      filename: file.filename,
      variant: file.variant ?? inferVariantFromFilename(file.filename, shortname, collection),
    };
  });
}

export const collectionLabels: Record<LogoCollection, string> = {
  simple: "Simple",
  themed: "Brand Kit",
};

const allowedVariants: LogoVariant[] = [
  "default",
  "icon",
  "mono",
  "light",
  "dark",
  "color",
  "wordmark",
  "wordmarkLight",
  "wordmarkDark",
  "size16",
  "size32",
  "size64",
  "line",
];

/** URL 쿼리 variant 파싱 */
export function parseVariantParam(value: string | null): LogoVariant {
  if (value && allowedVariants.includes(value as LogoVariant)) {
    return value as LogoVariant;
  }
  return "default";
}

/** URL 쿼리 collection 파싱 */
export function parseCollectionParam(
  value: string | null,
): LogoCollection | undefined {
  if (value === "simple" || value === "themed") return value;
  return undefined;
}
