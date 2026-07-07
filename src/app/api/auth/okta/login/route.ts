import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  createOAuthNonce,
  createOAuthState,
  createPkcePair,
  isOktaConfigured,
} from "@/lib/okta";

export const runtime = "nodejs";

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};

export async function GET() {
  if (!isOktaConfigured()) {
    return NextResponse.json(
      { error: "Okta가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = createOAuthState();
  const nonce = createOAuthNonce();

  const response = NextResponse.redirect(
    buildAuthorizeUrl({ state, nonce, codeChallenge }),
  );

  response.cookies.set("okta_oauth_state", state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set("okta_code_verifier", codeVerifier, OAUTH_COOKIE_OPTIONS);
  response.cookies.set("okta_nonce", nonce, OAUTH_COOKIE_OPTIONS);

  return response;
}
