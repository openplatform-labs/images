import { NextResponse } from "next/server";
import { getAdminBySession } from "@/lib/admin-users";
import { consumeOAuthExchange } from "@/lib/oauth-exchange";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };

  if (!body.code?.trim()) {
    return NextResponse.json({ error: "교환 코드가 없습니다." }, { status: 400 });
  }

  const sessionToken = consumeOAuthExchange(body.code.trim());
  if (!sessionToken) {
    return NextResponse.json(
      { error: "만료되었거나 유효하지 않은 코드입니다." },
      { status: 401 },
    );
  }

  const admin = getAdminBySession(sessionToken);
  if (!admin) {
    return NextResponse.json({ error: "세션을 확인하지 못했습니다." }, { status: 401 });
  }

  return NextResponse.json({
    token: sessionToken,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
}
