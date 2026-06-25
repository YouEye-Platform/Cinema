import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne, query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { tmdbFetch } from "@/lib/tmdb/client";
import { emitMovieWatched, emitReviewPosted, emitStatusChange } from "@/lib/timeline/emit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const { tmdbId } = await params;
  const url = new URL(request.url);
  const mediaType = url.searchParams.get("type") || "movie";

  const item = await getOne(
    `SELECT * FROM watchlist_items WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3`,
    [session.userId, parseInt(tmdbId), mediaType]
  );
  return NextResponse.json({ item: item || null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const { tmdbId } = await params;
  const body = await request.json();
  const { media_type, status, user_rating, review_text, watched_at } = body;

  if (!media_type || !["movie", "tv"].includes(media_type)) {
    return NextResponse.json({ error: "media_type required (movie|tv)" }, { status: 400 });
  }

  const tmdbIdNum = parseInt(tmdbId);

  const result = await query(
    `INSERT INTO watchlist_items (user_id, tmdb_id, media_type, status, user_rating, review_text, watched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, tmdb_id, media_type) DO UPDATE SET
       status = COALESCE($4, watchlist_items.status),
       user_rating = COALESCE($5, watchlist_items.user_rating),
       review_text = COALESCE($6, watchlist_items.review_text),
       watched_at = COALESCE($7, watchlist_items.watched_at),
       updated_at = NOW()
     RETURNING *`,
    [session.userId, tmdbIdNum, media_type, status, user_rating, review_text, watched_at]
  );

  // Emit timeline events
  try {
    const tmdbData = await tmdbFetch(`/${media_type}/${tmdbIdNum}`);
    const title = (tmdbData.title || tmdbData.name || String(tmdbIdNum)) as string;
    const overview = (tmdbData.overview || "") as string;
    const posterPath = (tmdbData.poster_path || null) as string | null;
    const year = ((tmdbData.release_date || tmdbData.first_air_date || "") as string).slice(0, 4);
    const voteAvg = (tmdbData.vote_average || null) as number | null;

    if (status === "watched") {
      await emitMovieWatched(session.userId, tmdbIdNum, media_type, title, overview, posterPath, user_rating || null, year, voteAvg);
    } else if (status) {
      await emitStatusChange(session.userId, tmdbIdNum, media_type, title, status, posterPath, year);
    }
    if (review_text?.trim()) {
      await emitReviewPosted(session.userId, tmdbIdNum, media_type, title, review_text, posterPath, user_rating || null, year);
    }
  } catch {
    // Non-critical
  }

  return NextResponse.json({ item: result.rows[0] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const { tmdbId } = await params;
  const url = new URL(request.url);
  const mediaType = url.searchParams.get("type") || "movie";

  await query(
    `DELETE FROM watchlist_items WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3`,
    [session.userId, parseInt(tmdbId), mediaType]
  );
  return NextResponse.json({ success: true });
}
