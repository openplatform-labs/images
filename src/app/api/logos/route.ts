import { NextResponse } from "next/server";
import { listLogos } from "@/lib/catalog";
import { ensureCatalogSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await ensureCatalogSynced();

  const { searchParams } = new URL(request.url);
  const result = listLogos({
    query: searchParams.get("q") ?? undefined,
    categorySlug: searchParams.get("category") ?? undefined,
    tagSlug: searchParams.get("tag") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "48"),
    sort: (searchParams.get("sort") as "name" | "recent") ?? "name",
  });

  return NextResponse.json(result);
}
