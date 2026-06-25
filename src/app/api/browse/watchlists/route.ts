import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET() {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const watchlists = await getMany(
    `SELECT w.id, w.name, w.description, w.user_id, w.share_token,
            COUNT(wi.id)::int AS item_count
     FROM watchlists w
     LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
     WHERE w.is_published = true
     GROUP BY w.id
     ORDER BY w.updated_at DESC
     LIMIT 50`,
    []
  );
  return NextResponse.json({ watchlists });
}
