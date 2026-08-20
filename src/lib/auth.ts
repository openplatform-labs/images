import { getAdminBySession } from "./admin-users";

export interface AuthAdmin {
  id: number;
  email: string;
  name: string | null;
}

export function getTokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }
  return request.headers.get("x-admin-token")?.trim() ?? null;
}

export function isAuthorizedRequest(request: Request): boolean {
  return getAuthenticatedAdmin(request) !== null;
}

export function getAuthenticatedAdmin(request: Request): AuthAdmin | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const admin = getAdminBySession(token);
  if (!admin) return null;

  return admin;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
}

