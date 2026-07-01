"use client";

const TOKEN_KEY = "admin_token";
const ADMIN_KEY = "admin_user";

export interface StoredAdmin {
  id: number;
  email: string;
  name: string | null;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredAdmin(): StoredAdmin | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAdmin;
  } catch {
    return null;
  }
}

export function saveAdminSession(token: string, admin: StoredAdmin): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** API 응답 JSON 파싱 (빈 본문 방어) */
export async function parseApiResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`서버 응답이 비어 있습니다. (HTTP ${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("서버 응답을 해석하지 못했습니다.");
  }
}
