import { NextResponse } from "next/server";
import {
  createSession,
  findAdminByEmail,
  verifyAuthCode,
} from "@/lib/admin-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    code?: string;
    purpose?: "login" | "reset";
  };

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();
  const purpose = body.purpose ?? "login";

  if (!email || !code) {
    return NextResponse.json(
      { error: "이메일과 인증 코드를 입력하세요." },
      { status: 400 },
    );
  }

  if (!verifyAuthCode(email, code, purpose)) {
    return NextResponse.json(
      { error: "인증 코드가 올바르지 않거나 만료되었습니다." },
      { status: 401 },
    );
  }

  const admin = findAdminByEmail(email);
  if (!admin) {
    return NextResponse.json({ error: "관리자를 찾을 수 없습니다." }, { status: 404 });
  }

  const token = createSession(admin.id);

  return NextResponse.json({
    ok: true,
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
}
