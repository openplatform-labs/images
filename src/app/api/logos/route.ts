import { NextResponse } from "next/server";
import { listLogos } from "@/lib/catalog";
import { resolveChannelFromHost } from "@/lib/channel";
import { parseCollectionParam } from "@/lib/collection";
import { pickLogoFile } from "@/lib/logo-files";
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

  if (channelId !== "icons") {
    return NextResponse.json(result);
  }

  return NextResponse.json({
    ...result,
    source: searchParams.get("source")?.trim().toLowerCase() || null,
    items: result.items.map((item) => {
      const file = pickLogoFile(item.files, item.shortname, item.collection, "default");
      return {
        ...item,
        pack: item.source,
        cdnUrl: file?.staticallyUrl ?? null,
      };
    }),
  });
}
