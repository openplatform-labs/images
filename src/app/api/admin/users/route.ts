import { NextResponse } from "next/server";
import {
  createAdmin,
  deactivateAdmin,
  listAdmins,
} from "@/lib/admin-users";
import { getAuthenticatedAdmin, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!getAuthenticatedAdmin(request)) return unauthorizedResponse();
  return NextResponse.json(listAdmins());
}

export async function POST(request: Request) {
  if (!getAuthenticatedAdmin(request)) return unauthorizedResponse();

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호가 필요합니다." },
      { status: 400 },
    );
  }

  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdmin({
      email: body.email.trim(),
      password: body.password,
      name: body.name?.trim(),
    });
    return NextResponse.json(admin, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "이미 등록된 이메일입니다." },
      { status: 409 },
    );
  }
}
