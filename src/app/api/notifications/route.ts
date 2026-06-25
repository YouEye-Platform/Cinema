import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-cinema");

export async function GET(request: Request) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const data = await api.fetchNotifications(session.userId, limit);
  return NextResponse.json(data || { notifications: [], unread_count: 0 });
}
