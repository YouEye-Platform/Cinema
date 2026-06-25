import { getSession } from "@/lib/auth";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { tmdbFetch, getImageUrl } from "@/lib/tmdb/client";

interface WidgetPageProps {
  params: Promise<{ widgetId: string }>;
}

/* ─── Data types ─────────────────────────────────────────── */

interface WatchItem {
  title: string;
  year: string;
  image: string | null;
  status: "watching" | "watched";
  rating: number | null;
}

interface TrendingItem {
  title: string;
  year: string;
  image: string | null;
  backdrop: string | null;
  voteAverage: number | null;
  overview: string;
}

/* ─── Data fetchers ──────────────────────────────────────── */

async function fetchNowWatching(userId: string): Promise<WatchItem[]> {
  const items = await getMany(
    `SELECT tmdb_id, media_type, status, user_rating, updated_at
     FROM watchlist_items
     WHERE user_id = $1 AND status IN ('watching', 'watched')
     ORDER BY updated_at DESC LIMIT 6`,
    [userId]
  );

  const enriched = await Promise.all(
    items.map(async (item) => {
      let title = `TMDB ${item.media_type} ${item.tmdb_id}`;
      let posterPath: string | null = null;
      let year = "";

      try {
        const tmdbData = await tmdbFetch(`/${item.media_type}/${item.tmdb_id}`, undefined, userId);
        title = (tmdbData.title || tmdbData.name || title) as string;
        posterPath = (tmdbData.poster_path as string | null) || null;
        const dateStr = (tmdbData.release_date || tmdbData.first_air_date || "") as string;
        year = dateStr ? dateStr.slice(0, 4) : "";
      } catch {
        // Use fallback title
      }

      return {
        title,
        year,
        image: getImageUrl(posterPath, "w185"),
        status: item.status as "watching" | "watched",
        rating: item.user_rating as number | null,
      };
    })
  );

  return enriched;
}

async function fetchTrending(userId: string): Promise<TrendingItem[]> {
  try {
    const data = await tmdbFetch("/trending/movie/day", undefined, userId);
    const results = (data.results as Array<Record<string, unknown>>) || [];
    const top6 = results.slice(0, 6);

    return top6.map((movie) => ({
      title: (movie.title || movie.name || "Unknown") as string,
      year: movie.release_date ? String(movie.release_date).slice(0, 4) : "",
      image: getImageUrl((movie.poster_path as string | null) || null, "w185"),
      backdrop: getImageUrl((movie.backdrop_path as string | null) || null, "w780"),
      voteAverage: movie.vote_average ? Number(movie.vote_average) : null,
      overview: ((movie.overview as string) || "").slice(0, 120),
    }));
  } catch {
    return [];
  }
}

/* ─── Page ───────────────────────────────────────────────── */

export default async function CinemaWidgetPage({ params }: WidgetPageProps) {
  const { widgetId } = await params;
  await runMigrations();

  if (widgetId === "now-watching") {
    const session = await getSession("ye-cinema").catch(() => null);
    if (!session) {
      return <EmptyState message="Sign in to see your watchlist." icon="lock" />;
    }

    const items = await fetchNowWatching(session.userId);
    if (items.length === 0) {
      return <EmptyState message="Nothing in your watchlist yet." icon="film" />;
    }

    return <NowWatchingWidget items={items} />;
  }

  if (widgetId === "trending") {
    const session = await getSession("ye-cinema").catch(() => null);
    if (!session) {
      return <EmptyState message="Sign in to see trending movies." icon="lock" />;
    }

    const items = await fetchTrending(session.userId);
    if (items.length === 0) {
      return <EmptyState message="Could not load trending movies." icon="film" />;
    }

    return <TrendingWidget items={items} />;
  }

  return <EmptyState message="Unknown widget." icon="alert" />;
}

/* ─── Now Watching — Poster Card Scroll ──────────────────── */

function NowWatchingWidget({ items }: { items: WatchItem[] }) {
  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      {/* Horizontal scroll of poster cards */}
      <div
        className="flex gap-2.5 overflow-x-auto pb-1 flex-1 min-h-0 items-start"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="shrink-0 group relative"
            style={{ width: "calc(min(130px, 28%))" }}
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 4v16M17 4v16M3 8h4M17 8h4M3 12h18M3 16h4M17 16h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}

              {/* Gradient overlay at bottom for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Status badge */}
              <div className="absolute top-1.5 left-1.5">
                {item.status === "watching" ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    Watching
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    Watched
                  </span>
                )}
              </div>

              {/* Rating badge (if user rated) */}
              {item.rating && (
                <div className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-md bg-amber-500/90 px-1 py-0.5 backdrop-blur-sm">
                  <svg className="w-2.5 h-2.5 text-white fill-white" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span className="text-[9px] font-bold text-white">{item.rating}</span>
                </div>
              )}

              {/* Title overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2 drop-shadow-sm">
                  {item.title}
                </p>
                {item.year && (
                  <p className="text-[9px] text-white/70 mt-0.5">{item.year}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Trending — Featured + Ranked List ──────────────────── */

function TrendingWidget({ items }: { items: TrendingItem[] }) {
  const [featured, ...rest] = items;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Featured #1 */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: "45%" }}>
        {featured.backdrop ? (
          <img
            src={featured.backdrop}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : featured.image ? (
          <img
            src={featured.image}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />

        {/* Rank badge */}
        <div className="absolute top-2 left-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-[11px] font-black text-white shadow-lg">
            1
          </span>
        </div>

        {/* Featured content */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end gap-2.5">
          {featured.image && (
            <img
              src={featured.image}
              alt={featured.title}
              className="w-14 h-20 rounded-md object-cover shadow-lg shrink-0 ring-1 ring-white/10"
            />
          )}
          <div className="min-w-0 flex-1 pb-0.5">
            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-1">
              {featured.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {featured.year && (
                <span className="text-[10px] text-muted-foreground">{featured.year}</span>
              )}
              {featured.voteAverage && (
                <span className="inline-flex items-center gap-0.5 text-[10px]">
                  <svg className="w-2.5 h-2.5 text-amber-500 fill-amber-500" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span className="font-semibold text-foreground">{featured.voteAverage.toFixed(1)}</span>
                </span>
              )}
            </div>
            {featured.overview && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                {featured.overview}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ranked list — items 2..N */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-1.5" style={{ scrollbarWidth: "none" }}>
        {rest.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 py-1.5 group"
          >
            {/* Rank number */}
            <span className="text-xl font-black text-foreground/15 w-6 text-center shrink-0 tabular-nums">
              {i + 2}
            </span>

            {/* Poster thumbnail */}
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="w-9 h-[52px] rounded-md object-cover shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-9 h-[52px] rounded-md bg-muted shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 4v16M17 4v16M3 8h4M17 8h4M3 12h18M3 16h4M17 16h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {item.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.year && (
                  <span className="text-[10px] text-muted-foreground">{item.year}</span>
                )}
                {item.voteAverage && (
                  <span className="inline-flex items-center gap-0.5 text-[10px]">
                    <svg className="w-2.5 h-2.5 text-amber-500 fill-amber-500" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span className="font-medium text-foreground">{item.voteAverage.toFixed(1)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Shared ─────────────────────────────────────────────── */

function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon: "film" | "lock" | "alert";
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-3">
      {icon === "film" && (
        <svg className="w-10 h-10 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 4v16M17 4v16M3 8h4M17 8h4M3 12h18M3 16h4M17 16h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      )}
      {icon === "lock" && (
        <svg className="w-10 h-10 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )}
      {icon === "alert" && (
        <svg className="w-10 h-10 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}
