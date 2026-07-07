import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSession, findAdminByEmail } from "@/lib/admin-users";
import { config } from "@/lib/config";
import { createOAuthExchange, purgeExpiredOAuthExchanges } from "@/lib/oauth-exchange";
import {
  exchangeAuthorizationCode,
  fetchOktaUserInfo,
  isOktaConfigured,
  resolveUserEmail,
} from "@/lib/okta";

export const runtime = "nodejs";

function redirectToAdmin(query: string): NextResponse {
  return NextResponse.redirect(`${config.siteBaseUrl}/admin?${query}`);
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.delete("okta_oauth_state");
  response.cookies.delete("okta_code_verifier");
  response.cookies.delete("okta_nonce");
}

export async function GET(request: NextRequest) {
  if (!isOktaConfigured()) {
    return redirectToAdmin("auth_error=okta_not_configured");
  }

  const parameters = request.nextUrl.searchParams;
  const oauthError = parameters.get("error");
  if (oauthError) {
    return redirectToAdmin(`auth_error=okta_${encodeURIComponent(oauthError)}`);
  }

  const code = parameters.get("code");
  const state = parameters.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("okta_oauth_state")?.value;
  const codeVerifier = cookieStore.get("okta_code_verifier")?.value;

  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    return redirectToAdmin("auth_error=okta_invalid_state");
  }

  try {
    const tokens = await exchangeAuthorizationCode(code, codeVerifier);
    const userInfo = await fetchOktaUserInfo(tokens.access_token);
    const email = resolveUserEmail(userInfo);

    if (!email) {
      return redirectToAdmin("auth_error=okta_no_email");
    }

    const admin = findAdminByEmail(email);
    if (!admin) {
      return redirectToAdmin("auth_error=okta_not_admin");
    }

    const sessionToken = createSession(admin.id);
    purgeExpiredOAuthExchanges();
    const exchangeCode = createOAuthExchange(sessionToken);

    const response = redirectToAdmin(`oauth_exchange=${exchangeCode}`);
    clearOAuthCookies(response);
    return response;
  } catch (caught) {
    const detail =
      caught instanceof Error ? encodeURIComponent(caught.message.slice(0, 120)) : "";
    const query = detail
      ? `auth_error=okta_failed&detail=${detail}`
      : "auth_error=okta_failed";
    return redirectToAdmin(query);
  }
}
