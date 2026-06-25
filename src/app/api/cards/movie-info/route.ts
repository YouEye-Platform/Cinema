import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { tmdbFetch, getImageUrl } from "@/lib/tmdb/client";

function extractTMDBId(url: string): { id: string; mediaType: string } | null {
  // themoviedb.org/movie/12345
  const movieMatch = url.match(/themoviedb\.org\/movie\/(\d+)/);
  if (movieMatch) return { id: movieMatch[1], mediaType: "movie" };

  // themoviedb.org/tv/12345
  const tvMatch = url.match(/themoviedb\.org\/tv\/(\d+)/);
  if (tvMatch) return { id: tvMatch[1], mediaType: "tv" };

  // imdb.com/title/tt1234567
  const imdbMatch = url.match(/imdb\.com\/title\/(tt\d+)/);
  if (imdbMatch) return { id: imdbMatch[1], mediaType: "imdb" };

  return null;
}

export async function GET(request: Request) {
  await runMigrations();

  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get("url") || "";

  const extracted = extractTMDBId(targetUrl);
  if (!extracted) {
    return NextResponse.json({ error: "URL not recognized" }, { status: 400 });
  }

  const externalUrl = process.env.CINEMA_EXTERNAL_URL || "";

  try {
    let tmdbData: Record<string, unknown>;
    let mediaType = extracted.mediaType;

    if (mediaType === "imdb") {
      // Find by IMDB ID
      const findData = await tmdbFetch("/find/" + extracted.id, { external_source: "imdb_id" });
      const movieResults = (findData.movie_results as Array<Record<string, unknown>>) || [];
      const tvResults = (findData.tv_results as Array<Record<string, unknown>>) || [];

      if (movieResults.length > 0) {
        tmdbData = await tmdbFetch(`/movie/${movieResults[0].id}`, { append_to_response: "credits" });
        mediaType = "movie";
      } else if (tvResults.length > 0) {
        tmdbData = await tmdbFetch(`/tv/${tvResults[0].id}`, { append_to_response: "credits" });
        mediaType = "tv";
      } else {
        return NextResponse.json({ error: "Not found on TMDB" }, { status: 404 });
      }
    } else {
      tmdbData = await tmdbFetch(`/${mediaType}/${extracted.id}`, { append_to_response: "credits" });
    }

    const title = (tmdbData.title || tmdbData.name || "Unknown") as string;
    const year = ((tmdbData.release_date || tmdbData.first_air_date || "") as string).slice(0, 4);
    const genres = ((tmdbData.genres as Array<{ name: string }>) || []).map((g) => g.name).join(", ");
    const runtime = tmdbData.runtime
      ? `${Math.floor(Number(tmdbData.runtime) / 60)}h ${Number(tmdbData.runtime) % 60}m`
      : null;
    const rating = tmdbData.vote_average ? `${Number(tmdbData.vote_average).toFixed(1)}/10` : null;
    const overview = (tmdbData.overview || "") as string;
    const poster = getImageUrl((tmdbData.poster_path as string | null) || null, "w342");
    const tmdbId = tmdbData.id as number;

    const credits = (tmdbData.credits as { crew?: Array<{ job: string; name: string }>; cast?: Array<{ name: string }> }) || {};
    const director = (credits.crew || []).find((c) => c.job === "Director")?.name;
    const cast = (credits.cast || []).slice(0, 3).map((c) => c.name).join(", ");

    const subtitleParts = [year, genres, runtime].filter(Boolean);

    const facts = [
      rating ? { label: "Rating", value: rating } : null,
      director ? { label: "Director", value: director } : null,
      cast ? { label: "Cast", value: cast } : null,
      year ? { label: "Release", value: year } : null,
    ].filter(Boolean);

    const tmdbUrl = `https://themoviedb.org/${mediaType}/${tmdbId}`;
    const cinemaUrl = `${externalUrl}/${mediaType}/${tmdbId}`;

    return NextResponse.json({
      card_type: "movie-info",
      provider: "ye-cinema",
      title,
      subtitle: subtitleParts.join(" • "),
      description: overview.slice(0, 300),
      image: poster,
      facts,
      actions: [
        { label: "View in Cinema", url: cinemaUrl },
        { label: "TMDB", url: tmdbUrl, external: true },
      ],
      source_url: cinemaUrl,
      external_url: tmdbUrl,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch TMDB data", details: String(err) }, { status: 502 });
  }
}
