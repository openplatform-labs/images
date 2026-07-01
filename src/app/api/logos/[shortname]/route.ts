import { NextResponse } from "next/server";
import { getLogoByShortname } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  const { shortname } = await context.params;
  const logo = getLogoByShortname(shortname);

  if (!logo) {
    return NextResponse.json({ error: "로고를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(logo);
}
