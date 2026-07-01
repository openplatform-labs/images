"use client";

import { useTheme } from "@/components/ThemeProvider";
import { getPreviewThemeClass } from "@/lib/preview-theme";

interface LogoPreviewFrameProps {
  children: React.ReactNode;
  className?: string;
  large?: boolean;
}

export function LogoPreviewFrame({
  children,
  className = "",
  large = false,
}: LogoPreviewFrameProps) {
  const { previewTheme } = useTheme();
  const themeClass = getPreviewThemeClass(previewTheme);

  return (
    <div
      className={`logo-preview-frame ${themeClass} flex items-center justify-center ${large ? "min-h-[280px] p-12" : "min-h-[160px] p-8"} ${className}`}
    >
      {children}
    </div>
  );
}
