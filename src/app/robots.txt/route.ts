import { getChannelConfig, resolveChannelFromHost } from "@/lib/channel";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const channel = getChannelConfig(
    resolveChannelFromHost(request.headers.get("host")),
  );

  const body = `User-agent: *
Allow: /
Allow: /api/
Allow: /llms.txt
Allow: /openapi.json
Allow: /.well-known/mcp.json
Allow: /mcp
Disallow: /admin

Sitemap: ${channel.siteBaseUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
