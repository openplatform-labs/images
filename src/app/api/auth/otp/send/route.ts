import { NextResponse } from "next/server";
import { createAuthCode, findAdminByEmail } from "@/lib/admin-users";
import { sendAuthCodeEmail } from "@/lib/email";
import { isSmtpConfigured } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "SMTP가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    email?: string;
    purpose?: "login" | "reset";
  };

  const email = body.email?.trim().toLowerCase();
  const purpose = body.purpose ?? "login";

  if (!email) {
    return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });
  }

  const admin = findAdminByEmail(email);
  if (!admin) {
    // 보안: 존재하지 않는 이메일도 동일 응답
    return NextResponse.json({
      ok: true,
      message: "등록된 이메일이면 인증 코드가 발송됩니다.",
    });
  }

  try {
    const code = createAuthCode(email, purpose);
    await sendAuthCodeEmail({ to: email, code, purpose });

    return NextResponse.json({
      ok: true,
      message: `${email}로 인증 코드를 발송했습니다.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "메일 발송 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
