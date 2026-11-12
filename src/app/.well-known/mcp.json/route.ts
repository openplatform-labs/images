import { getChannelConfig, resolveChannelFromHost } from "@/lib/channel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 아이콘 채널 MCP 카드. 다른 호스트는 게시하지 않는다 */
export async function GET(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  if (channelId !== "icons") {
    return Response.json(
      { error: "MCP is published on the icons channel." },
      { status: 404 },
    );
  }

  const siteBase = getChannelConfig("icons").siteBaseUrl;
  const body = {
    name: "opensphere-icons",
    description:
      "Read-only icon search for icons.opl.io.kr. Start with list_packs, then search_icons or get_icon.",
    version: "1.0.0",
    transport: {
      type: "streamable-http",
      url: `${siteBase}/mcp`,
    },
    capabilities: {
      tools: ["list_packs", "search_icons", "get_icon"],
    },
  };

  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
