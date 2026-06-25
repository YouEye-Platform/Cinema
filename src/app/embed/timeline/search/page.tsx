/**
 * Cinema Timeline Embed — Search Card
 *
 * Compact card showing a Cinema search query + top results.
 * All data from URL params — Cinema fetches fresh from TMDB.
 *
 * Query params:
 *   ?q=iron+man  — The search query
 */

import { tmdbFetch, getImageUrl } from "@/lib/tmdb/client";
import { runMigrations } from "@/lib/db/migrate";
import { Search, Film, Tv, Star } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  media_type: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

export default async function TimelineSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { q } = params;

  if (!q) {
    return <ErrorCard message="No query provided" />;
  }

  await runMigrations();

  try {
    const data = await tmdbFetch("/search/multi", { query: q });
    const results = ((data.results ?? []) as unknown as SearchResult[])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 3);
    const totalResults = (data.total_results as number) ?? 0;

    const cinemaBaseUrl =
      process.env.CINEMA_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL || "";

    return (
      <div className="p-2.5">
        {/* Search header */}
        <div className="flex items-center gap-1.5 mb-2">
          <Search className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px] font-medium text-amber-500">
            Searched Cinema
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {totalResults} result{totalResults !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Query */}
        <p className="text-sm font-medium text-foreground mb-2">
          &ldquo;{q}&rdquo;
        </p>

        {/* Top results */}
        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((r) => {
              const title = r.title || r.name || "Unknown";
              const year = (r.release_date || r.first_air_date || "").slice(0, 4);
              const poster = getImageUrl(r.poster_path || null, "w92");
              const rating = r.vote_average ? r.vote_average.toFixed(1) : null;
              const url = cinemaBaseUrl
                ? `${cinemaBaseUrl}/${r.media_type}/${r.id}`
                : null;

              return (
                <div key={r.id} className="flex items-center gap-2">
                  {poster && (
                    <img
                      src={poster}
                      alt=""
                      className="w-7 h-10 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {url ? (
                      <a
                        href={url}
                        target="_top"
                        className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {title}
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-foreground truncate block">
                        {title}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {r.media_type === "tv" ? (
                        <Tv className="h-2.5 w-2.5" />
                      ) : (
                        <Film className="h-2.5 w-2.5" />
                      )}
                      {year && <span>{year}</span>}
                      {rating && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                          {rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  } catch (err) {
    return <ErrorCard message={`Search failed: ${err instanceof Error ? err.message : "Unknown"}`} />;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="p-2.5">
      <p className="text-xs text-muted-foreground py-2 text-center">{message}</p>
    </div>
  );
}
