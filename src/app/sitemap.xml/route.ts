import { NextResponse } from "next/server";
import {
  channelHasDetailPages,
  getChannelConfig,
  getChannelItemPageUrl,
  resolveChannelFromHost,
  type ChannelId,
} from "@/lib/channel";
import { addonExamples } from "@/lib/datagrid-addons";
import { getDatabase } from "@/lib/db";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SitemapEntry {
  location: string;
  lastModified?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 채널 홈과 채널 전용 정적 페이지 */
function buildStaticEntries(channelId: ChannelId): SitemapEntry[] {
  const siteBase = getChannelConfig(channelId).siteBaseUrl;
  const entries: SitemapEntry[] = [{ location: `${siteBase}/` }];

  if (channelId === "datagrid") {
    entries.push(
      { location: `${siteBase}/grid-core` },
      { location: `${siteBase}/grid-addons` },
      ...addonExamples.map((example) => ({
        location: `${siteBase}/grid-addons/${example.id}`,
      })),
    );
  }

  return entries;
}

export async function GET(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  await ensureCatalogSynced(channelId);

  const entries = buildStaticEntries(channelId);

  if (channelHasDetailPages(channelId)) {
    const rows = getDatabase()
      .prepare(
        "SELECT shortname, updated_at FROM logos WHERE channel = ? ORDER BY name COLLATE NOCASE",
      )
      .all(channelId) as { shortname: string; updated_at: string }[];

    for (const row of rows) {
      entries.push({
        location: getChannelItemPageUrl(channelId, row.shortname),
        lastModified: row.updated_at.slice(0, 10),
      });
    }
  }

  const urls = entries
    .map((entry) => {
      const lastModified = entry.lastModified
        ? `\n    <lastmod>${entry.lastModified}</lastmod>`
        : "";
      return `  <url>\n    <loc>${escapeXml(entry.location)}</loc>${lastModified}\n  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
