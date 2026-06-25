import { NextResponse, type NextRequest } from "next/server";
import { getOAuthConfig, exchangeCodeForToken, fetchUserInfo } from "@/lib/auth";
import { createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("cinema-oauth-state")?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/api/auth/sso", request.url));
  }

  const config = getOAuthConfig();
  if (!config) return NextResponse.json({ error: "SSO not configured" }, { status: 503 });

  const externalUrl = process.env.CINEMA_EXTERNAL_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const redirectUri = `${externalUrl}/api/auth/callback`;

  const tokenData = await exchangeCodeForToken(config, code, redirectUri);
  if (!tokenData) return NextResponse.redirect(new URL("/api/auth/sso", request.url));

  const userInfo = await fetchUserInfo(config, tokenData.access_token);
  if (!userInfo) return NextResponse.redirect(new URL("/api/auth/sso", request.url));

  const isAdmin = (userInfo.groups || []).some((g: string) => g.toLowerCase().includes("admin"));
  const sessionToken = await createSession({
    userId: userInfo.sub,
    username: userInfo.preferred_username || userInfo.name || "user",
    name: userInfo.name || userInfo.preferred_username || "User",
    email: userInfo.email || "",
    isAdmin,
    groups: userInfo.groups || [],
  });

  const externalRoot = process.env.CINEMA_EXTERNAL_URL ?? new URL("/", request.url).origin;
  const postLoginRedirect = request.cookies.get("cinema-oauth-redirect")?.value;
  const redirectTo = postLoginRedirect && postLoginRedirect.startsWith("/")
    ? `${externalRoot}${postLoginRedirect}`
    : `${externalRoot}/`;
  const response = NextResponse.redirect(redirectTo);
  response.cookies.set("ye-cinema-session", sessionToken, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES !== "false",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
  response.cookies.delete("cinema-oauth-state");
  response.cookies.delete("cinema-oauth-redirect");
  return response;
}
