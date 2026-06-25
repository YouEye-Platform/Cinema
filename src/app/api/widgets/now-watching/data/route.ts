import { NextResponse } from "next/server";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { getImageUrl, tmdbFetch } from "@/lib/tmdb/client";

export async function GET(request: Request) {
  await runMigrations();
  const userId = request.headers.get("x-youeye-user");
  if (!userId) return NextResponse.json({ items: [] });

  const items = await getMany(
    `SELECT tmdb_id, media_type, status, user_rating, updated_at
     FROM watchlist_items
     WHERE user_id = $1 AND status IN ('watching', 'watched')
     ORDER BY updated_at DESC LIMIT 5`,
    [userId]
  );

  const externalUrl = process.env.CINEMA_EXTERNAL_URL || "";

  const enriched = await Promise.all(
    items.map(async (item) => {
      let title = `TMDB ${item.media_type} ${item.tmdb_id}`;
      let posterPath: string | null = null;
      let year = "";

      try {
        const tmdbData = await tmdbFetch(`/${item.media_type}/${item.tmdb_id}`);
        title = (tmdbData.title || tmdbData.name || title) as string;
        posterPath = (tmdbData.poster_path as string | null) || null;
        const dateStr = (tmdbData.release_date || tmdbData.first_air_date || "") as string;
        year = dateStr ? dateStr.slice(0, 4) : "";
      } catch {
        // Use fallback title
      }

      return {
        title,
        subtitle: [year, item.user_rating ? `${item.user_rating}/10` : null]
          .filter(Boolean)
          .join(" • "),
        image: getImageUrl(posterPath, "w185"),
        timestamp: item.updated_at,
        action: {
          type: "link",
          url: `${externalUrl}/${item.media_type}/${item.tmdb_id}`,
        },
      };
    })
  );

  return NextResponse.json({
    widget_type: "list",
    title: "Now Watching",
    items: enriched,
    empty_message: "Nothing in your watchlist yet.",
    action: { label: "Open Cinema", url: externalUrl },
  });
}
