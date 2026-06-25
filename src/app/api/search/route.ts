import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET(request: Request) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json({ items: [] });

  // Search in review_text; also do a simple tmdb_id match for direct ID searches
  const items = await getMany(
    `SELECT * FROM watchlist_items
     WHERE user_id = $1 AND (
       review_text ILIKE $2
       OR CAST(tmdb_id AS TEXT) = $3
     )
     ORDER BY updated_at DESC LIMIT 20`,
    [session.userId, `%${q}%`, q.trim()]
  );
  return NextResponse.json({ items });
}
