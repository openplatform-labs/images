import { NextResponse } from "next/server";
import { resolveChannelFromHost } from "@/lib/channel";
import { getOpenApiSpec } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  return NextResponse.json(getOpenApiSpec(channelId), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
