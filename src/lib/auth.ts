import {
  getAdminBySession,
  verifyAdminPassword,
} from "./admin-users";
import { config } from "./config";

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
  if (token) {
    const admin = getAdminBySession(token);
    if (admin) return admin;
  }

  // 레거시: 환경 변수 비밀번호 (마이그레이션 호환)
  const legacyPassword = request.headers.get("x-admin-password");
  if (legacyPassword && legacyPassword === config.adminPassword && config.adminEmail) {
    return { id: 0, email: config.adminEmail, name: "Legacy" };
  }

  return null;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
}

export { verifyAdminPassword };
