import { NextResponse } from "next/server";
import { buildCatalogDump } from "@/lib/resolve";
import { ensureCatalogSynced } from "@/lib/server-catalog";

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
  await ensureCatalogSynced();

  const { searchParams } = new URL(request.url);
  const fields = searchParams.get("fields") ?? undefined;
  const payload = buildCatalogDump(fields);

  return NextResponse.json(payload, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
