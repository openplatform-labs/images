import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSession, findAdminByEmail } from "@/lib/admin-users";
import { createOAuthExchange, purgeExpiredOAuthExchanges } from "@/lib/oauth-exchange";
import {
  exchangeAuthorizationCode,
  fetchOktaUserInfo,
  getRequestSiteOrigin,
  isOktaConfigured,
  normalizeSiteOrigin,
  resolveUserEmail,
} from "@/lib/okta";

export const runtime = "nodejs";

function redirectToAdmin(siteOrigin: string, query: string): NextResponse {
  return NextResponse.redirect(
    `${normalizeSiteOrigin(siteOrigin)}/admin?${query}`,
  );
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.delete("okta_oauth_state");
  response.cookies.delete("okta_code_verifier");
  response.cookies.delete("okta_nonce");
  response.cookies.delete("okta_oauth_origin");
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const siteOrigin =
    cookieStore.get("okta_oauth_origin")?.value ||
    getRequestSiteOrigin(request);

  if (!isOktaConfigured()) {
    return redirectToAdmin(siteOrigin, "auth_error=okta_not_configured");
  }

  const parameters = request.nextUrl.searchParams;
  const oauthError = parameters.get("error");
  if (oauthError) {
    return redirectToAdmin(
      siteOrigin,
      `auth_error=okta_${encodeURIComponent(oauthError)}`,
    );
  }

  const code = parameters.get("code");
  const state = parameters.get("state");
  const savedState = cookieStore.get("okta_oauth_state")?.value;
  const codeVerifier = cookieStore.get("okta_code_verifier")?.value;

  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    return redirectToAdmin(siteOrigin, "auth_error=okta_invalid_state");
  }

  try {
    const tokens = await exchangeAuthorizationCode(
      code,
      codeVerifier,
      siteOrigin,
    );
    const userInfo = await fetchOktaUserInfo(tokens.access_token);
    const email = resolveUserEmail(userInfo);

    if (!email) {
      return redirectToAdmin(siteOrigin, "auth_error=okta_no_email");
    }

    const admin = findAdminByEmail(email);
    if (!admin) {
      return redirectToAdmin(siteOrigin, "auth_error=okta_not_admin");
    }

    const sessionToken = createSession(admin.id);
    purgeExpiredOAuthExchanges();
    const exchangeCode = createOAuthExchange(sessionToken);

    const response = redirectToAdmin(
      siteOrigin,
      `oauth_exchange=${exchangeCode}`,
    );
    clearOAuthCookies(response);
    return response;
  } catch (caught) {
    const detail =
      caught instanceof Error
        ? encodeURIComponent(caught.message.slice(0, 120))
        : "";
    const query = detail
      ? `auth_error=okta_failed&detail=${detail}`
      : "auth_error=okta_failed";
    return redirectToAdmin(siteOrigin, query);
  }
}
