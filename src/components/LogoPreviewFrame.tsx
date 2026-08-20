"use client";

import { useTheme } from "@/components/ThemeProvider";
import { getPreviewThemeClass } from "@/lib/preview-theme";

interface LogoPreviewFrameProps {
  children: React.ReactNode;
  className?: string;
  large?: boolean;
  /** 패딩·최소높이 없이 미디어 풀블리드 */
  flush?: boolean;
}

export function LogoPreviewFrame({
  children,
  className = "",
  large = false,
  flush = false,
}: LogoPreviewFrameProps) {
  const { previewTheme } = useTheme();
  const themeClass = flush ? "" : getPreviewThemeClass(previewTheme);

  return (
    <div
      className={`logo-preview-frame ${themeClass} flex items-center justify-center ${
        flush
          ? "min-h-0 p-0"
          : large
            ? "min-h-[280px] p-12"
            : "min-h-[160px] p-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}
