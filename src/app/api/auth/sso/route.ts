import { NextResponse, type NextRequest } from "next/server";
import { getOAuthConfig, buildAuthorizeUrl, generateOAuthState } from "@/lib/auth/identity";

export async function GET(request: NextRequest) {
  const config = getOAuthConfig();
  if (!config) return NextResponse.json({ error: "SSO not configured" }, { status: 503 });

  const state = generateOAuthState();
  const externalUrl = process.env.CINEMA_EXTERNAL_URL || "";
  const redirectUri = `${externalUrl}/api/auth/callback`;
  const authorizeUrl = buildAuthorizeUrl(config, redirectUri, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("cinema-oauth-state", state, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES !== "false",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  // Store the post-login redirect destination
  const postLoginRedirect = request.nextUrl.searchParams.get("redirect");
  if (postLoginRedirect && postLoginRedirect.startsWith("/")) {
    response.cookies.set("cinema-oauth-redirect", postLoginRedirect, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== "false",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }
  return response;
}
