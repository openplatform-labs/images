import { NextResponse } from "next/server";
import { deactivateAdmin } from "@/lib/admin-users";
import { getAuthenticatedAdmin, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const currentAdmin = getAuthenticatedAdmin(request);
  if (!currentAdmin) return unauthorizedResponse();

  const { id } = await context.params;
  const targetId = Number(id);

  if (currentAdmin.id === targetId) {
    return NextResponse.json(
      { error: "자신의 계정은 비활성화할 수 없습니다." },
      { status: 400 },
    );
  }

  deactivateAdmin(targetId);
  return NextResponse.json({ ok: true });
}
