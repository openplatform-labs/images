"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ChannelId } from "@/lib/channel";
import type { PreviewTheme, SiteTheme } from "@/lib/preview-theme";

interface ThemeContextValue {
  previewTheme: PreviewTheme;
  siteTheme: SiteTheme;
  setPreviewTheme: (theme: PreviewTheme) => void;
  setSiteTheme: (theme: SiteTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  channelId: ChannelId;
  defaultSiteTheme: SiteTheme;
}

export function ThemeProvider({
  children,
  channelId,
  defaultSiteTheme,
}: ThemeProviderProps) {
  const previewKey = `os-${channelId}-preview-theme`;
  const siteKey = `os-${channelId}-site-theme`;
  const [previewTheme, setPreviewThemeState] = useState<PreviewTheme>("light");
  const [siteTheme, setSiteThemeState] = useState<SiteTheme>(defaultSiteTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedPreview = localStorage.getItem(previewKey) as PreviewTheme | null;
    const storedSite = localStorage.getItem(siteKey) as SiteTheme | null;
    const lockDark =
      channelId === "images" ||
      channelId === "avatars" ||
      channelId === "icons" ||
      channelId === "pictograms";
    if (storedPreview) setPreviewThemeState(storedPreview);
    if (lockDark) setSiteThemeState(defaultSiteTheme);
    else if (storedSite) setSiteThemeState(storedSite);
    else setSiteThemeState(defaultSiteTheme);
    setReady(true);
  }, [previewKey, siteKey, defaultSiteTheme, channelId]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-site-theme", siteTheme);
    document.documentElement.setAttribute("data-channel", channelId);
    localStorage.setItem(siteKey, siteTheme);
  }, [siteTheme, ready, siteKey, channelId]);

  function setPreviewTheme(theme: PreviewTheme) {
    setPreviewThemeState(theme);
    localStorage.setItem(previewKey, theme);
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
