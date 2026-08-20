/** 아이콘 묶음 slug → 갤러리 표시명 */
const iconPackLabels: Record<string, string> = {
  carbon: "IBM Carbon",
  "ibm-carbon": "IBM Carbon",
  "core-16": "Core 16",
  "icon-system": "Core 16",
  pictograms: "IBM Carbon Pictograms",
  "carbon-pictograms": "IBM Carbon Pictograms",
  lucide: "Lucide",
  heroicons: "Heroicons",
  phosphor: "Phosphor",
  feather: "Feather",
  tabler: "Tabler",
  remix: "Remix Icon",
  bootstrap: "Bootstrap",
  material: "Material",
  "material-symbols": "Material Symbols",
};

/** 픽토그램 묶음은 아이콘보다 크게 표시 */
export function isPictogramPack(slug: string | null | undefined): boolean {
  const normalized = (slug ?? "").trim().toLowerCase();
  return normalized === "pictograms" || normalized === "carbon-pictograms";
}

/** 묶음 slug를 사람이 읽는 이름으로 변환 */
export function formatIconPackLabel(slug: string | null | undefined): string {
  const trimmed = (slug ?? "").trim();
  if (!trimmed) return "Unfiled";
  const known = iconPackLabels[trimmed.toLowerCase()];
  if (known) return known;
  return trimmed
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
