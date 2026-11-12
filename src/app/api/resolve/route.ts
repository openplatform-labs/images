import { NextResponse } from "next/server";
import { resolveLogoQuery } from "@/lib/resolve";
import { resolveChannelScope } from "@/lib/channel";
import { parseCollectionParam, parseVariantParam } from "@/lib/collection";
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
  const query = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const variant = parseVariantParam(searchParams.get("variant"));
  const collection = parseCollectionParam(searchParams.get("collection"));
  const format = searchParams.get("format") ?? "json";
  const source = scope === "icons" ? (searchParams.get("source") ?? undefined) : undefined;

  if (!query.trim()) {
    return NextResponse.json(
      {
        error: "Missing query parameter: q",
        scope,
        example: "/api/resolve?q=react&variant=default&format=json",
      },
      { status: 400, headers: corsHeaders },
    );
  }

  const result = resolveLogoQuery(query, variant, collection, scope, source);

  if (format === "minimal") {
    if (!result.url) {
      return NextResponse.json(
        { error: "No match", scope, note: result.note, candidates: result.candidates },
        { status: 404, headers: corsHeaders },
      );
    }

    return new NextResponse(result.url, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const status = result.url ? 200 : 404;

  return NextResponse.json(result, {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=300",
    },
  });
}
