import { buildStaticallyUrl } from "./statically";
import type { LogoFile, LogoVariant } from "./types";

/** 파일명에서 로고 변형(variant) 추론 */
export function inferLogoVariant(filename: string, shortname: string): LogoVariant {
  const lower = filename.toLowerCase();

  if (lower.includes("-icon") || lower.includes("_icon")) {
    return "icon";
  }

  if (lower.includes("wordmark") || lower.includes("-logo-text")) {
    return "wordmark";
  }

  if (lower === `${shortname}.svg` || lower.endsWith(".svg")) {
    return "default";
  }

  return "default";
}

/** 파일 목록을 AI·API용 메타데이터로 보강 */
export function enrichLogoFiles(
  shortname: string,
  filenames: string[],
): LogoFile[] {
  return filenames.map((filename) => ({
    filename,
    staticallyUrl: buildStaticallyUrl(filename),
    role: inferLogoVariant(filename, shortname),
    format: "svg" as const,
    scalable: true,
  }));
}

/** variant에 맞는 파일 선택 (없으면 default 폴백) */
export function pickLogoFile(
  files: LogoFile[],
  shortname: string,
  variant: LogoVariant = "default",
): LogoFile | null {
  if (files.length === 0) return null;

  const byVariant = files.filter((file) => file.role === variant);
  if (byVariant.length > 0) {
    const preferred = byVariant.find(
      (file) => file.filename === `${shortname}.svg`,
    );
    return preferred ?? byVariant[0];
  }

  if (variant === "default") {
    const mainFile = files.find((file) => file.filename === `${shortname}.svg`);
    if (mainFile) return mainFile;

    const nonIcon = files.filter((file) => file.role !== "icon");
    return nonIcon[0] ?? files[0];
  }

  const nonIcon = files.filter((file) => file.role !== "icon");
  return nonIcon[0] ?? files[0];
}
