/** 아이콘 묶음 slug → 갤러리 표시명 */
const iconPackLabels: Record<string, string> = {
  carbon: "IBM Carbon",
  "ibm-carbon": "IBM Carbon",
  "core-16": "Core 16",
  "icon-system": "Core 16",
  "file-explorer": "File Explorer",
  azure: "Azure",
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

/** 팩 폴더 README·LICENSE에 적힌 사용 안내만. 없는 팩은 null */
const iconPackUsageNotes: Record<string, string> = {
  azure:
    "Use only to represent the Microsoft service in architecture diagrams, training, or documentation. Do not crop, flip, rotate, or distort. Source: https://learn.microsoft.com/azure/architecture/icons/",
  carbon:
    "IBM Carbon icons under the Apache License, Version 2.0 (Copyright 2015 IBM Corp.). See icons/carbon/LICENSE.",
  "core-16":
    "MIT License, Copyright (c) 2026 OpenSphere Platform. See icons/core-16/LICENSE.",
  "file-explorer":
    "Lucide icons under the ISC License; this pack keeps file, folder, and explorer icons only. See icons/file-explorer/README.md.",
};

export function iconPackUsageNote(slug: string | null | undefined): string | null {
  const key = (slug ?? "").trim().toLowerCase();
  if (!key) return null;
  return iconPackUsageNotes[key] ?? null;
}

/** resolve·MCP가 같이 쓰는 img 한 줄 */
export function iconImgSnippet(url: string, name: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  return `<img src="${escape(url)}" alt="${escape(name)}" />`;
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
