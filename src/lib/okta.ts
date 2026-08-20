import crypto from "crypto";
import { getChannelConfig, resolveChannelFromHost } from "./channel";
import { config } from "./config";

export interface OktaTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

export interface OktaUserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

export function isOktaConfigured(): boolean {
  return Boolean(
    config.okta.clientId &&
      config.okta.clientSecret &&
      config.okta.authorizeUrl &&
      config.okta.tokenUrl &&
      config.okta.userinfoUrl,
  );
}

export function normalizeSiteOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** 프록시 뒤에서도 공개 Origin 계산 (Host / X-Forwarded-*) */
export function getRequestSiteOrigin(request: {
  headers: Headers;
  nextUrl: URL;
}): string {
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = (hostHeader ?? "").split(",")[0].trim().split(":")[0].toLowerCase();

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return normalizeSiteOrigin(request.nextUrl.origin);
  }

  const channelId = resolveChannelFromHost(hostHeader);
  const channel = getChannelConfig(channelId);
  if (channel.hosts.includes(host)) {
    return channel.siteBaseUrl;
  }

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? "https";
  return `${proto}://${host}`;
}

export function getOktaRedirectUri(siteOrigin: string): string {
  return `${normalizeSiteOrigin(siteOrigin)}/api/auth/okta/callback`;
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function createOAuthNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildAuthorizeUrl(params: {
  state: string;
  nonce: string;
  codeChallenge: string;
  siteOrigin: string;
}): string {
  const search = new URLSearchParams({
    client_id: config.okta.clientId,
    response_type: "code",
    scope: config.okta.scopes,
    redirect_uri: getOktaRedirectUri(params.siteOrigin),
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });

  return `${config.okta.authorizeUrl}?${search.toString()}`;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  siteOrigin: string,
): Promise<OktaTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getOktaRedirectUri(siteOrigin),
    client_id: config.okta.clientId,
    client_secret: config.okta.clientSecret,
    code_verifier: codeVerifier,
  });

  const response = await fetch(config.okta.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as OktaTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Okta 토큰 교환 실패");
  }

  return payload;
}

export async function fetchOktaUserInfo(accessToken: string): Promise<OktaUserInfo> {
  const response = await fetch(config.okta.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = (await response.json()) as OktaUserInfo & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Okta 사용자 정보 조회 실패");
  }

  return payload;
}

export function resolveUserEmail(userInfo: OktaUserInfo): string | null {
  const email = userInfo.email?.trim().toLowerCase();
  if (email) return email;

  const username = userInfo.preferred_username?.trim().toLowerCase();
  if (username?.includes("@")) return username;

  return null;
}

export function buildOktaLogoutUrl(
  siteOrigin: string,
  idTokenHint?: string,
): string | null {
  if (!config.okta.logoutUrl) return null;

  const search = new URLSearchParams({
    post_logout_redirect_uri: `${normalizeSiteOrigin(siteOrigin)}/admin`,
  });

  if (idTokenHint) {
    search.set("id_token_hint", idTokenHint);
  }

  return `${config.okta.logoutUrl}?${search.toString()}`;
}
