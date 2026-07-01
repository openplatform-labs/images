import { NextResponse } from "next/server";
import {
  getAuthenticatedAdmin,
  getTokenFromRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import { deleteSession } from "@/lib/admin-users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) return unauthorizedResponse();

  return NextResponse.json({ admin });
}

export async function DELETE(request: Request) {
  const token = getTokenFromRequest(request);
  if (token) deleteSession(token);
  return NextResponse.json({ ok: true });
}
