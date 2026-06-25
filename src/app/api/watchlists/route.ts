import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany, query } from "@/lib/db/client";
import { runMigrations, ensureDefaultWatchlist } from "@/lib/db/migrate";

export async function GET() {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  await ensureDefaultWatchlist(session.userId);

  const watchlists = await getMany(
    `SELECT w.*, COUNT(wi.id)::int AS item_count
     FROM watchlists w
     LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
     WHERE w.user_id = $1
     GROUP BY w.id
     ORDER BY w.is_default DESC, w.sort_order ASC, w.created_at ASC`,
    [session.userId]
  );
  return NextResponse.json({ watchlists });
}

export async function POST(request: Request) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const { name, description } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const result = await query(
    `INSERT INTO watchlists (user_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [session.userId, name.trim(), description || ""]
  );
  return NextResponse.json({ watchlist: result.rows[0] }, { status: 201 });
}
