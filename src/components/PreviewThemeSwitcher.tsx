"use client";

import { previewThemeOptions } from "@/lib/preview-theme";
import { useTheme } from "@/components/ThemeProvider";

export function PreviewThemeSwitcher() {
  const { previewTheme, setPreviewTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted">Preview</span>
      <div className="flex gap-1.5 rounded-full border border-border bg-surface p-1">
        {previewThemeOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            onClick={() => setPreviewTheme(option.id)}
            className={`h-7 w-7 rounded-full border-2 transition ${
              previewTheme === option.id
                ? "border-accent scale-110"
                : "border-transparent hover:border-border"
            }`}
            style={{
              background:
                option.id === "checker"
                  ? "repeating-conic-gradient(#c5c9d0 0% 25%, #f0f2f5 0% 50%) 50% / 10px 10px"
                  : option.swatch,
            }}
            aria-label={option.label}
          />
        ))}
      </div>
    </div>
  );
}
