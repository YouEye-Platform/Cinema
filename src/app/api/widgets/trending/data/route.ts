import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { tmdbFetch, getImageUrl } from "@/lib/tmdb/client";

export async function GET() {
  await runMigrations();

  try {
    const data = await tmdbFetch("/trending/movie/day");
    const results = (data.results as Array<Record<string, unknown>>) || [];
    const top5 = results.slice(0, 5);

    const items = top5.map((movie) => ({
      title: (movie.title || movie.name || "Unknown") as string,
      subtitle: [
        movie.release_date ? String(movie.release_date).slice(0, 4) : "",
        movie.vote_average ? `${Number(movie.vote_average).toFixed(1)}/10` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      image: getImageUrl((movie.poster_path as string | null) || null, "w185"),
    }));

    return NextResponse.json({
      widget_type: "list",
      title: "Trending Movies",
      items,
      action: { label: "Open Cinema", url: process.env.CINEMA_EXTERNAL_URL || "" },
    });
  } catch {
    return NextResponse.json({
      widget_type: "list",
      title: "Trending Movies",
      items: [],
      error: "Failed to fetch trending data",
    });
  }
}
