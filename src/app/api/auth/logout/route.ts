import { NextResponse } from "next/server";

const SSO_SLUG = "ye-cinema";
const APP_COOKIE = "ye-cinema-session";

export async function POST() {
  const identityUrl = process.env.IDENTITY_URL || "";
  const uiUrl =
    process.env.YOUEYE_UI_URL ||
    `https://${(process.env.NEXT_PUBLIC_APP_URL || "").split(".").slice(1).join(".")}`;
  const endSessionUrl = `${identityUrl}/application/o/${SSO_SLUG}/end-session/?post_logout_redirect_uri=${encodeURIComponent(uiUrl)}`;

  const response = NextResponse.json({ ok: true, redirect: endSessionUrl });
  response.cookies.delete(APP_COOKIE);

  const domain = extractParentDomain(process.env.NEXT_PUBLIC_APP_URL || "");
  if (domain) {
    response.cookies.set("ye-logout-ts", String(Date.now()), {
      domain: `.${domain}`,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.SECURE_COOKIES !== "false",
      maxAge: 300,
    });
  }

  return response;
}

function extractParentDomain(url: string): string | null {
  try {
    const hostname = url.includes("://") ? new URL(url).hostname : url;
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts.slice(-parts.length + 1).join(".") : null;
  } catch {
    return null;
  }
}
