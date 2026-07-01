import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OpenSphere Logos — SVG Logo Gallery",
  description:
    "opensphere-platform/logos 저장소 기반 SVG 로고 갤러리. Statically CDN URL 제공.",
  other: {
    "llms-txt": "/llms.txt",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${syne.variable} ${dmSans.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted">
            <p>
              <a
                href="https://github.com/opensphere-platform/logos"
                className="hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                opensphere-platform/logos
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
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
