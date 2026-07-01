"use client";

const TOKEN_KEY = "admin_token";
const ADMIN_KEY = "admin_user";

export const ADMIN_UNAUTHORIZED_EVENT = "admin:unauthorized";

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

/** 세션 만료 시 로그인 화면으로 되돌림 */
export function notifyAdminUnauthorized(): void {
  clearAdminSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT));
  }
}

/** 서버에 토큰 유효성 확인 */
export async function validateAdminSession(): Promise<StoredAdmin | null> {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const response = await fetch("/api/auth/me", { headers: authHeaders() });
    if (!response.ok) {
      clearAdminSession();
      return null;
    }

    const data = (await response.json()) as { admin?: StoredAdmin };
    if (!data.admin) {
      clearAdminSession();
      return null;
    }

    saveAdminSession(token, data.admin);
    return data.admin;
  } catch {
    clearAdminSession();
    return null;
  }
}

/** 관리자 API 호출 (401이면 세션 정리) */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    notifyAdminUnauthorized();
  }

  return response;
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
