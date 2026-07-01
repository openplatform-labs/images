import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/catalog";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listCategories());
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const body = (await request.json()) as {
    name?: string;
    description?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "카테고리 이름이 필요합니다." }, { status: 400 });
  }

  try {
    const category = createCategory({
      name: body.name.trim(),
      description: body.description?.trim(),
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "카테고리 생성에 실패했습니다." }, { status: 409 });
  }
}
