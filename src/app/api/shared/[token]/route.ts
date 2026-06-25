import { NextResponse, type NextRequest } from "next/server";
import { getOne, getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await runMigrations();
  const { token } = await params;

  const watchlist = await getOne(
    `SELECT id, name, description, user_id, is_shared FROM watchlists WHERE share_token = $1`,
    [token]
  );
  if (!watchlist || !watchlist.is_shared) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await getMany(
    `SELECT tmdb_id, media_type, status, user_rating, added_at FROM watchlist_items
     WHERE watchlist_id = $1 ORDER BY added_at DESC`,
    [watchlist.id as string]
  );
  return NextResponse.json({ watchlist, items });
}
