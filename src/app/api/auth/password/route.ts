import { NextResponse } from "next/server";
import {
  getAuthenticatedAdmin,
  getTokenFromRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  findAdminByEmail,
  updateAdminPassword,
  verifyAuthCode,
} from "@/lib/admin-users";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    email?: string;
    code?: string;
  };

  // OTP로 비밀번호 재설정
  if (body.email && body.code && body.newPassword) {
    if (!verifyAuthCode(body.email, body.code, "reset")) {
      return NextResponse.json(
        { error: "인증 코드가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    const admin = findAdminByEmail(body.email);
    if (!admin) {
      return NextResponse.json({ error: "관리자를 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    updateAdminPassword(admin.id, body.newPassword);
    return NextResponse.json({ ok: true, message: "비밀번호가 변경되었습니다." });
  }

  // 로그인 상태에서 비밀번호 변경
  const currentAdmin = getAuthenticatedAdmin(request);
  if (!currentAdmin) return unauthorizedResponse();

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: "현재 비밀번호와 새 비밀번호를 입력하세요." },
      { status: 400 },
    );
  }

  if (body.newPassword.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 },
    );
  }

  const admin = findAdminByEmail(currentAdmin.email);
  if (!admin) return unauthorizedResponse();

  const bcrypt = await import("bcryptjs");
  if (!bcrypt.compareSync(body.currentPassword, admin.passwordHash)) {
    return NextResponse.json(
      { error: "현재 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  updateAdminPassword(admin.id, body.newPassword);
  return NextResponse.json({ ok: true, message: "비밀번호가 변경되었습니다." });
}

export async function POST(request: Request) {
  return PATCH(request);
}
