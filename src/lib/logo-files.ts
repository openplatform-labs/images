import { inferVariantFromFilename } from "./collection";
import { buildStaticallyUrl } from "./statically";
import type { LogoCollection, LogoFile, LogoVariant } from "./types";

/** DB·JSON 메타를 LogoFile 배열로 변환 */
export function enrichLogoFiles(
  shortname: string,
  files: { filename: string; variant?: string }[],
  collection: LogoCollection,
): LogoFile[] {
  return files.map((file) => {
    const role = (file.variant ??
      inferVariantFromFilename(file.filename, shortname, collection)) as LogoVariant;

    return {
      filename: file.filename,
      staticallyUrl: buildStaticallyUrl(file.filename),
      role,
      format: "svg" as const,
      scalable: true,
    };
  });
}

/** simple: icon / themed: mono 등 컬렉션별 variant 선택 */
export function pickLogoFile(
  files: LogoFile[],
  shortname: string,
  collection: LogoCollection,
  variant: LogoVariant = "default",
): LogoFile | null {
  if (files.length === 0) return null;

  const resolveVariant = (): LogoVariant => {
    if (variant !== "default" && variant !== "icon") return variant;
    if (collection === "themed" && variant === "icon") return "mono";
    return variant;
  };

  const targetVariant = resolveVariant();
  const byVariant = files.filter((file) => file.role === targetVariant);
  if (byVariant.length > 0) {
    const preferred = byVariant.find(
      (file) => file.filename === `${shortname}.svg`,
    );
    return preferred ?? byVariant[0];
  }

  if (targetVariant === "default") {
    const mainFile = files.find((file) => file.filename === `${shortname}.svg`);
    if (mainFile) return mainFile;
    return files[0];
  }

  if (collection === "themed" && targetVariant === "mono") {
    const monoFile = files.find((file) => file.role === "mono");
    if (monoFile) return monoFile;
  }

  return files[0];
}

/** 갤러리 카드용 대표 파일 */
export function pickGalleryPreviewFile(
  files: LogoFile[],
  shortname: string,
  collection: LogoCollection,
  source?: string | null,
): LogoFile | null {
  if (collection === "themed") {
    // techicons(devicon)는 심볼(default)을 먼저 보여줌
    const previewPriority: LogoVariant[] =
      source === "devicon"
        ? [
            "color",
            "default",
            "wordmark",
            "light",
            "dark",
            "size64",
            "size32",
            "size16",
            "mono",
          ]
        : [
            "color",
            "wordmark",
            "light",
            "dark",
            "default",
            "size64",
            "size32",
            "size16",
            "mono",
          ];

    for (const variant of previewPriority) {
      const file = pickLogoFile(files, shortname, collection, variant);
      if (!file) continue;
      // color 등 없는 variant는 pickLogoFile이 files[0]으로 떨어지므로 role로 검증
      if (file.role === variant) return file;
      if (variant === "default" && file.filename === `${shortname}.svg`) {
        return file;
      }
    }

    return files[0] ?? null;
  }

  return (
    pickLogoFile(files, shortname, collection, "default") ??
    pickLogoFile(files, shortname, collection, "icon")
  );
}
