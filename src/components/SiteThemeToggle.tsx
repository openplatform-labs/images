"use client";

import { useTheme } from "@/components/ThemeProvider";

export function SiteThemeToggle() {
  const { siteTheme, setSiteTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setSiteTheme(siteTheme === "light" ? "dark" : "light")}
      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition hover:text-foreground"
      aria-label="사이트 테마 전환"
    >
      {siteTheme === "light" ? "다크" : "라이트"}
    </button>
  );
}
