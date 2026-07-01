import { NextResponse } from "next/server";
import { createTag, listTags } from "@/lib/catalog";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listTags());
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "태그 이름이 필요합니다." }, { status: 400 });
  }

  try {
    const tag = createTag(body.name.trim());
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: "태그 생성에 실패했습니다." }, { status: 409 });
  }
}
