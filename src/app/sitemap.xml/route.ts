import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";

const siteBase =
  process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://logos.opl.io.kr";

export async function GET() {
  await ensureCatalogSynced();

  const database = getDatabase();
  const rows = database
    .prepare("SELECT shortname, updated_at FROM logos ORDER BY name COLLATE NOCASE")
    .all() as { shortname: string; updated_at: string }[];

  const urls = rows
    .map(
      (row) => `  <url>
    <loc>${siteBase}/logo/${row.shortname}</loc>
    <lastmod>${row.updated_at.slice(0, 10)}</lastmod>
  </url>`,
    )
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
