import { NextResponse } from "next/server";
import {
  createSession,
  findAdminByEmail,
  verifyAdminPassword,
} from "@/lib/admin-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 입력하세요." },
      { status: 400 },
    );
  }

  const admin = verifyAdminPassword(body.email.trim(), body.password);
  if (!admin) {
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = createSession(admin.id);

  return NextResponse.json({
    ok: true,
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
}
