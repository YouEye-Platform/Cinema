import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { internetFetch } from "@/lib/internet";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await params;
  const target = `https://image.tmdb.org/${path.join("/")}`;
  const upstream = await internetFetch(target, { cache: "no-store" }, session.userId);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: upstream.status || 502 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  // Browser delivery must recheck admission after logout, revocation or account switch.
  headers.set("cache-control", "private, no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}
