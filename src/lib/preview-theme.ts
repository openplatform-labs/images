export type PreviewTheme = "light" | "dark" | "muted" | "checker";

export type SiteTheme = "light" | "dark";

export interface PreviewThemeOption {
  id: PreviewTheme;
  label: string;
  swatch: string;
}

export const previewThemeOptions: PreviewThemeOption[] = [
  { id: "light", label: "밝음", swatch: "#ffffff" },
  { id: "dark", label: "어두움", swatch: "#111111" },
  { id: "muted", label: "회색", swatch: "#e2e5ea" },
  { id: "checker", label: "투명", swatch: "linear-gradient(45deg,#ccc 25%,transparent 25%)" },
];

export function getPreviewThemeClass(theme: PreviewTheme): string {
  return `logo-preview-${theme}`;
}
