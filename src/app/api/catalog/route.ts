import { NextResponse } from "next/server";
import { resolveChannelScope } from "@/lib/channel";
import { buildCatalogDump } from "@/lib/resolve";
import { ensureScopeSynced } from "@/lib/server-catalog";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const scope = resolveChannelScope(request);
  await ensureScopeSynced(scope);

  const { searchParams } = new URL(request.url);
  const fields = searchParams.get("fields") ?? undefined;
  const payload = buildCatalogDump(fields, scope);
  const body =
    scope === "icons"
      ? {
          ...payload,
          note: "Indexing dump for the icons channel. Use /api/resolve?source={pack} or /api/logos/{shortname} for lookups.",
        }
      : payload;

  return NextResponse.json(body, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
