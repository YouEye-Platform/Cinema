import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-cinema");

export async function GET() {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await api.getUserSettings(session.userId);
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const success = await api.saveUserSettings(session.userId, body.settings || body);
  return NextResponse.json({ success });
}
