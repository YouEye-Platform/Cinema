import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany, query, getOne } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { tmdbFetch } from "@/lib/tmdb/client";
import { emitAddedToWatchlist } from "@/lib/timeline/emit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  // Verify watchlist belongs to user
  const watchlist = await getOne(
    `SELECT id FROM watchlists WHERE id = $1 AND user_id = $2`,
    [id, session.userId]
  );
  if (!watchlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await getMany(
    `SELECT * FROM watchlist_items WHERE watchlist_id = $1 ORDER BY added_at DESC`,
    [id]
  );
  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  // Verify watchlist belongs to user
  const watchlist = await getOne(
    `SELECT id FROM watchlists WHERE id = $1 AND user_id = $2`,
    [id, session.userId]
  );
  if (!watchlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tmdb_id, media_type } = await request.json();
  if (!tmdb_id || !["movie", "tv"].includes(media_type)) {
    return NextResponse.json({ error: "Invalid tmdb_id or media_type" }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO watchlist_items (user_id, watchlist_id, tmdb_id, media_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, tmdb_id, media_type) DO UPDATE
       SET watchlist_id = EXCLUDED.watchlist_id, updated_at = NOW()
     RETURNING *`,
    [session.userId, id, tmdb_id, media_type]
  );

  // Emit timeline event (best-effort)
  try {
    const tmdbData = await tmdbFetch(`/${media_type}/${tmdb_id}`);
    const title = (tmdbData.title || tmdbData.name || String(tmdb_id)) as string;
    const posterPath = (tmdbData.poster_path || null) as string | null;
    const year = ((tmdbData.release_date || tmdbData.first_air_date || "") as string).slice(0, 4);
    await emitAddedToWatchlist(session.userId, tmdb_id, media_type, title, posterPath, year);
  } catch {
    // Non-critical
  }

  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
}
