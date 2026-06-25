import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-cinema");

export async function PUT(request: Request) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mode } = await request.json();
  if (!["dark", "light", "system"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  const success = await api.syncThemeMode(session.userId, mode);
  return NextResponse.json({ success });
}
