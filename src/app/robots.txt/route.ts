const siteBase =
  process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://images.opl.io.kr";

export async function GET() {
  const body = `User-agent: *
Allow: /
Allow: /api/
Allow: /llms.txt
Allow: /openapi.json

Sitemap: ${siteBase}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
