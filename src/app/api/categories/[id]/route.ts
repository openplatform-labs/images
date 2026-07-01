import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const { id } = await context.params;
  const database = getDatabase();
  database.prepare("DELETE FROM categories WHERE id = ?").run(Number(id));

  return NextResponse.json({ ok: true });
}
