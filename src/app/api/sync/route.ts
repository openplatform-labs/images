import { NextResponse } from "next/server";
import { syncCatalogFromSource } from "@/lib/catalog";
import { isChannelId, resolveChannelFromHost } from "@/lib/channel";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      channel?: string;
    };
    const channelId = isChannelId(body.channel)
      ? body.channel
      : resolveChannelFromHost(request.headers.get("host"));

    const result = await syncCatalogFromSource(channelId);
    return NextResponse.json({
      ok: true,
      channel: channelId,
      message: `${result.synced}개 동기화 완료 (자동 카테고리 ${result.autoTagged}건)`,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "동기화 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
