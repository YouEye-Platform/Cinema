import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { tmdbFetch } from "@/lib/tmdb/client";
import { runMigrations } from "@/lib/db/migrate";
import { emitMovieViewed, emitCinemaSearch } from "@/lib/timeline/emit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await runMigrations();

  const { path } = await params;
  const tmdbPath = "/" + path.join("/");

  // Forward query params (except Next.js internals)
  const url = new URL(request.url);
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (!key.startsWith("_")) {
      queryParams[key] = value;
    }
  });

  try {
    const data = await tmdbFetch(tmdbPath, queryParams, session.userId);

    // ── Timeline: emit movie/TV viewed when a detail page is fetched ──
    // Pattern: /movie/{id} or /tv/{id} (with optional append_to_response)
    const detailMatch = tmdbPath.match(/^\/(movie|tv)\/(\d+)$/);
    if (detailMatch) {
      const mediaType = detailMatch[1];
      const tmdbId = parseInt(detailMatch[2]);
      const title = (data.title || data.name || "") as string;
      const overview = (data.overview || "") as string;
      const posterPath = (data.poster_path || null) as string | null;
      const year = ((data.release_date || data.first_air_date || "") as string).slice(0, 4);
      const voteAvg = (data.vote_average || null) as number | null;

      // Fire-and-forget — don't block the response
      emitMovieViewed(session.userId, tmdbId, mediaType, title, overview, posterPath, year, voteAvg).catch(() => {});
    }

    // ── Timeline: emit cinema search query ──
    // Pattern: /search/multi?query=...
    if (tmdbPath === "/search/multi" && queryParams.query) {
      const resultCount = (data.total_results ?? 0) as number;
      emitCinemaSearch(session.userId, queryParams.query, resultCount).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[tmdb-proxy] Error:", err);
    return NextResponse.json(
      { error: "TMDB API error", details: String(err) },
      { status: 502 }
    );
  }
}
