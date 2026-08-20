import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** 비밀번호 로그인은 더 이상 지원하지 않음 — Okta 또는 이메일 OTP 사용 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "비밀번호 로그인은 지원하지 않습니다. Okta 또는 이메일 인증을 사용하세요.",
    },
    { status: 410 },
  );
}
