import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/openapi";

export async function GET() {
  return NextResponse.json(getOpenApiSpec(), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
