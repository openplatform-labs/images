import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  Archivo,
  Figtree,
  Fraunces,
  Outfit,
  Sora,
  Source_Sans_3,
  Syne,
} from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getChannelTheme } from "@/lib/channel-theme";
import { getRequestChannelConfig } from "@/lib/request-channel";
import { getGithubRepoUrl } from "@/lib/config";
import { getChannelGithub, type ChannelId } from "@/lib/channel";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function channelFontClass(channelId: ChannelId): string {
  if (channelId === "images") {
    return `${sora.variable} ${sourceSans.variable}`;
  }
  if (channelId === "illust") {
    return `${fraunces.variable} ${figtree.variable}`;
  }
  if (channelId === "avatars") {
    return `${syne.variable} ${outfit.variable}`;
  }
  if (channelId === "icons" || channelId === "pictograms") {
    return `${sora.variable} ${sourceSans.variable}`;
  }
  // logos
  return `${archivo.variable} ${sourceSans.variable}`;
}

function channelFontStyle(channelId: ChannelId): CSSProperties {
  if (channelId === "images") {
    return {
      ["--font-display" as string]: "var(--font-sora)",
      ["--font-body" as string]: "var(--font-source-sans)",
    };
  }
  if (channelId === "illust") {
    return {
      ["--font-display" as string]: "var(--font-fraunces)",
      ["--font-body" as string]: "var(--font-figtree)",
    };
  }
  if (channelId === "avatars") {
    return {
      ["--font-display" as string]: "var(--font-syne)",
      ["--font-body" as string]: "var(--font-outfit)",
    };
  }
  if (channelId === "icons" || channelId === "pictograms") {
    return {
      ["--font-display" as string]: "var(--font-sora)",
      ["--font-body" as string]: "var(--font-source-sans)",
    };
  }
  return {
    ["--font-display" as string]: "var(--font-archivo)",
    ["--font-body" as string]: "var(--font-source-sans)",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const channel = await getRequestChannelConfig();
  return {
    title: channel.metaTitle,
    description: channel.heroDescription,
    other: {
      "llms-txt": "/llms.txt",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const channel = await getRequestChannelConfig();
  const theme = getChannelTheme(channel.id);

  return (
    <html
      lang="ko"
      className={`${channelFontClass(channel.id)} h-full`}
      data-channel={channel.id}
      data-gallery={theme.galleryLayout}
      data-site-theme={theme.defaultSiteTheme}
      style={channelFontStyle(channel.id)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        <ThemeProvider
          channelId={channel.id}
          defaultSiteTheme={theme.defaultSiteTheme}
        >
          <SiteHeader brandName={channel.brandName} channelId={channel.id} />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted">
            <p>
              <a
                href={getGithubRepoUrl(channel.id)}
                className="hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                {getChannelGithub(channel.id).owner}/{getChannelGithub(channel.id).repo}
              </a>
              {" · "}
              <a
                href="https://statically.io"
                className="hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                Statically CDN
              </a>
              {" · "}
              {channel.siteBaseUrl.replace(/^https?:\/\//, "")}
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
