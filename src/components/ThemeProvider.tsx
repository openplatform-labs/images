"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PreviewTheme, SiteTheme } from "@/lib/preview-theme";

interface ThemeContextValue {
  previewTheme: PreviewTheme;
  siteTheme: SiteTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
  setSiteTheme: (theme: SiteTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const PREVIEW_KEY = "os-logos-preview-theme";
const SITE_KEY = "os-logos-site-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [previewTheme, setPreviewThemeState] = useState<PreviewTheme>("light");
  const [siteTheme, setSiteThemeState] = useState<SiteTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedPreview = localStorage.getItem(PREVIEW_KEY) as PreviewTheme | null;
    const storedSite = localStorage.getItem(SITE_KEY) as SiteTheme | null;
    if (storedPreview) setPreviewThemeState(storedPreview);
    if (storedSite) setSiteThemeState(storedSite);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-site-theme", siteTheme);
    localStorage.setItem(SITE_KEY, siteTheme);
  }, [siteTheme, ready]);

  function setPreviewTheme(theme: PreviewTheme) {
    setPreviewThemeState(theme);
    localStorage.setItem(PREVIEW_KEY, theme);
  }

  function setSiteTheme(theme: SiteTheme) {
    setSiteThemeState(theme);
  }

  return (
    <ThemeContext.Provider
      value={{ previewTheme, siteTheme, setPreviewTheme, setSiteTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
