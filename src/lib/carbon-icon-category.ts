import carbonIconCategories from "./carbon-icon-categories.json";
import carbonPictogramCategories from "./carbon-pictogram-categories.json";
import { formatIconPackLabel, isPictogramPack } from "./icon-pack";

const iconGlyphMap = carbonIconCategories.byGlyph as Record<string, string>;
const iconSectionOrder = carbonIconCategories.order as string[];
const pictogramGlyphMap = carbonPictogramCategories.byGlyph as Record<
  string,
  string
>;
const pictogramSectionOrder = carbonPictogramCategories.order as string[];

/** Carbon 파일명을 라이브러리 키로 맞춤 */
export function normalizeCarbonGlyphKey(value: string): string {
  return value.trim().toLowerCase().replace(/--/g, "-");
}

/** shortname(carbon-add-filled / pictograms-airplane)에서 글리프 키만 추출 */
export function carbonGlyphKeyFromShortname(
  shortname: string,
  source: string | null,
): string {
  const normalized = normalizeCarbonGlyphKey(shortname);
  const pack = (source ?? "carbon").trim().toLowerCase();
  const prefix = `${pack}-`;
  if (normalized.startsWith(prefix)) {
    return normalized.slice(prefix.length);
  }
  return normalized;
}

/** 라이브러리 섹션 제목 — Carbon 아이콘/픽토그램은 공식 카테고리 */
export function getIconLibrarySection(
  shortname: string,
  source: string | null,
): string {
  const pack = (source ?? "").trim().toLowerCase();
  const key = carbonGlyphKeyFromShortname(shortname, source);
  if (pack === "carbon" || pack === "ibm-carbon") {
    return iconGlyphMap[key] ?? "Other";
  }
  if (isPictogramPack(pack)) {
    return pictogramGlyphMap[key] ?? "Other";
  }
  return formatIconPackLabel(source);
}

function sectionOrderForSource(source: string | null | undefined): string[] {
  if (isPictogramPack(source)) return pictogramSectionOrder;
  return iconSectionOrder;
}

/** 섹션 표시 순서 */
export function getIconLibrarySectionIndex(
  section: string,
  source?: string | null,
): number {
  const order = sectionOrderForSource(source);
  const index = order.indexOf(section);
  return index === -1 ? order.length : index;
}

/** 카테고리 칩 목록 */
export function listLibrarySections(source?: string | null): string[] {
  return [...sectionOrderForSource(source), "Other"];
}

/** 섹션명 → 쿼리용 slug */
export function slugifyLibrarySection(section: string): string {
  return section
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
