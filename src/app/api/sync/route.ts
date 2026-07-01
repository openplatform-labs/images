import { NextResponse } from "next/server";
import { syncCatalogFromSource } from "@/lib/catalog";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  try {
    const result = await syncCatalogFromSource();
    return NextResponse.json({
      ok: true,
      message: `${result.synced}개 로고 동기화 완료 (자동 카테고리 ${result.autoTagged}건)`,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "동기화 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
