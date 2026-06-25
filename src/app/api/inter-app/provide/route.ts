import { NextResponse } from "next/server";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function POST(request: Request) {
  await runMigrations();
  const body = await request.json();
  const { request_type, data } = body;

  if (request_type === "search" && data?.query) {
    const userId = data.user_id;
    if (!userId) return NextResponse.json({ results: [] });

    const results = await getMany(
      `SELECT tmdb_id, media_type, status, user_rating, review_text, added_at
       FROM watchlist_items
       WHERE user_id = $1 AND review_text ILIKE $2
       ORDER BY updated_at DESC LIMIT 5`,
      [userId, `%${data.query}%`]
    );

    const externalUrl = process.env.CINEMA_EXTERNAL_URL || "";

    return NextResponse.json({
      provider: "ye-cinema",
      results: results.map((r) => ({
        title: `${r.media_type === "movie" ? "Movie" : "TV"} ID ${r.tmdb_id}`,
        preview: r.review_text ? String(r.review_text).slice(0, 150) : `Status: ${r.status}`,
        url: `${externalUrl}/${r.media_type}/${r.tmdb_id}`,
        updated_at: r.added_at,
      })),
    });
  }

  if (request_type === "info-card" && data?.url) {
    const externalUrl = process.env.CINEMA_EXTERNAL_URL || "";
    const cardUrl = `${externalUrl}/api/cards/movie-info?url=${encodeURIComponent(data.url)}`;
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const card = await res.json();
      return NextResponse.json(card);
    } catch {
      return NextResponse.json({ error: "Failed to fetch info card" }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Unknown request type" }, { status: 400 });
}
