import { NextResponse } from "next/server";
import { listIconPacks } from "@/lib/catalog";
import { resolveChannelFromHost } from "@/lib/channel";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";

/** 현재 채널의 아이콘 묶음 목록 */
export async function GET(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  await ensureCatalogSynced(channelId);
  if (channelId !== "icons") {
    return NextResponse.json([]);
  }
  return NextResponse.json(listIconPacks(channelId));
}
