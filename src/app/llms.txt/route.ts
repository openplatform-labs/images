import { resolveChannelFromHost } from "@/lib/channel";
import { buildLlmsContent } from "@/lib/llms-content";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  await ensureCatalogSynced(channelId);

  return new Response(buildLlmsContent(channelId), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
