import { NextResponse } from "next/server";
import { listLogos } from "@/lib/catalog";
import { resolveChannelFromHost } from "@/lib/channel";
import { parseCollectionParam } from "@/lib/collection";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const channelId = resolveChannelFromHost(request.headers.get("host"));
  await ensureCatalogSynced(channelId);

  const { searchParams } = new URL(request.url);
  const result = listLogos({
    channel: channelId,
    query: searchParams.get("q") ?? undefined,
    categorySlug: searchParams.get("category") ?? undefined,
    tagSlug: searchParams.get("tag") ?? undefined,
    collection:
      channelId === "logos"
        ? parseCollectionParam(searchParams.get("collection"))
        : undefined,
    source:
      channelId === "icons"
        ? searchParams.get("source") ?? undefined
        : undefined,
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "48"),
    sort: (searchParams.get("sort") as "name" | "recent") ?? "name",
  });

  return NextResponse.json(result);
}
