/**
 * Cinema Info Card — Rich movie/TV embed for Search RHS
 *
 * Loaded as an iframe by YE-App-Search when a result matches
 * imdb.com or themoviedb.org. Renders a responsive card that
 * adapts to the container width passed via `w` URL param.
 *
 * Rich mode (w >= 400): Backdrop hero, large poster, full details,
 *   cast with characters, watch providers, tagline.
 * Compact mode (w < 400): Poster + title + basics (original layout).
 *
 * Query params:
 *   ?url=https://imdb.com/title/tt0371746&w=520
 */

import { getSession } from "@/lib/auth";
import { runMigrations } from "@/lib/db/migrate";
import { getOne } from "@/lib/db/client";
import { tmdbFetch, getImageUrl } from "@/lib/tmdb/client";
import {
  Star,
  Clock,
  Film,
  Tv,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Play,
} from "lucide-react";

interface CardPageProps {
  searchParams: Promise<{ url?: string; w?: string }>;
}

function extractTMDBId(url: string): { id: string; mediaType: string } | null {
  const movieMatch = url.match(/themoviedb\.org\/movie\/(\d+)/);
  if (movieMatch) return { id: movieMatch[1], mediaType: "movie" };

  const tvMatch = url.match(/themoviedb\.org\/tv\/(\d+)/);
  if (tvMatch) return { id: tvMatch[1], mediaType: "tv" };

  const imdbMatch = url.match(/imdb\.com\/title\/(tt\d+)/);
  if (imdbMatch) return { id: imdbMatch[1], mediaType: "imdb" };

  return null;
}

interface TMDBData {
  id: number;
  title?: string;
  name?: string;
  tagline?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    crew?: Array<{ job: string; name: string }>;
    cast?: Array<{ name: string; character: string; profile_path: string | null }>;
  };
}

interface WatchProvider {
  logo_path: string;
  provider_name: string;
  provider_id: number;
}

interface WatchProviderData {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: WatchProvider[];
      rent?: WatchProvider[];
      buy?: WatchProvider[];
    }
  >;
}

interface WatchlistItem {
  status: string;
  user_rating: number | null;
}

export default async function MovieCardPage({ searchParams }: CardPageProps) {
  const params = await searchParams;
  const { url } = params;
  const containerWidth = parseInt(params.w || "480", 10);

  if (!url) {
    return <CardError message="No URL provided" />;
  }

  const extracted = extractTMDBId(url);
  if (!extracted) {
    return <CardError message="URL not recognized" />;
  }

  await runMigrations();
  const session = await getSession("ye-cinema").catch(() => null);
  const userId = session?.userId;

  try {
    let tmdbData: TMDBData;
    let mediaType = extracted.mediaType;

    if (mediaType === "imdb") {
      const findData = await tmdbFetch("/find/" + extracted.id, {
        external_source: "imdb_id",
      }, userId);
      const movieResults = (findData.movie_results ?? []) as unknown as TMDBData[];
      const tvResults = (findData.tv_results ?? []) as unknown as TMDBData[];

      if (movieResults.length > 0) {
        tmdbData = (await tmdbFetch(`/movie/${movieResults[0].id}`, {
          append_to_response: "credits",
        }, userId)) as unknown as TMDBData;
        mediaType = "movie";
      } else if (tvResults.length > 0) {
        tmdbData = (await tmdbFetch(`/tv/${tvResults[0].id}`, {
          append_to_response: "credits",
        }, userId)) as unknown as TMDBData;
        mediaType = "tv";
      } else {
        return <CardError message="Not found on TMDB" />;
      }
    } else {
      tmdbData = (await tmdbFetch(`/${mediaType}/${extracted.id}`, {
        append_to_response: "credits",
      }, userId)) as unknown as TMDBData;
    }

    // Fetch watch providers (separate call — not available via append_to_response)
    let watchProviders: {
      stream: WatchProvider[];
      rent: WatchProvider[];
      buy: WatchProvider[];
      link?: string;
    } = { stream: [], rent: [], buy: [] };
    try {
      const wpData = (await tmdbFetch(
        `/${mediaType}/${tmdbData.id}/watch/providers`,
        undefined,
        userId
      )) as unknown as WatchProviderData;
      // Try user's likely region (US fallback)
      const region = wpData.results?.US ?? wpData.results?.GB ?? Object.values(wpData.results ?? {})[0];
      if (region) {
        watchProviders = {
          stream: (region.flatrate ?? []).slice(0, 5),
          rent: (region.rent ?? []).slice(0, 3),
          buy: (region.buy ?? []).slice(0, 3),
          link: region.link,
        };
      }
    } catch {
      // Non-critical — card works without providers
    }

    // Try to get user watchlist status
    let watchlistItem: WatchlistItem | null = null;
    if (session) {
      watchlistItem = (await getOne(
        `SELECT status, user_rating FROM watchlist_items WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3`,
        [session.userId, tmdbData.id, mediaType]
      )) as WatchlistItem | null;
    }

    const title = tmdbData.title || tmdbData.name || "Unknown";
    const tagline = tmdbData.tagline || "";
    const year = (tmdbData.release_date || tmdbData.first_air_date || "").slice(0, 4);
    const genres = (tmdbData.genres || []).map((g) => g.name);
    const runtime = tmdbData.runtime
      ? `${Math.floor(tmdbData.runtime / 60)}h ${tmdbData.runtime % 60}m`
      : null;
    const seasonInfo =
      tmdbData.number_of_seasons
        ? `${tmdbData.number_of_seasons} season${tmdbData.number_of_seasons !== 1 ? "s" : ""}` +
          (tmdbData.number_of_episodes ? ` · ${tmdbData.number_of_episodes} episodes` : "")
        : null;
    const rating = tmdbData.vote_average ? tmdbData.vote_average.toFixed(1) : null;
    const voteCount = tmdbData.vote_count ?? 0;
    const overview = tmdbData.overview || "";
    const poster = getImageUrl(tmdbData.poster_path || null, containerWidth >= 400 ? "w342" : "w185");
    const backdrop = getImageUrl(tmdbData.backdrop_path || null, "w1280");
    const director = (tmdbData.credits?.crew || []).find((c) => c.job === "Director")?.name;
    const writers = (tmdbData.credits?.crew || [])
      .filter((c) => c.job === "Writer" || c.job === "Screenplay")
      .slice(0, 2)
      .map((c) => c.name);
    const cast = (tmdbData.credits?.cast || []).slice(0, containerWidth >= 400 ? 8 : 4);

    const cinemaBaseUrl =
      process.env.CINEMA_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const cinemaUrl = cinemaBaseUrl
      ? `${cinemaBaseUrl}/${mediaType}/${tmdbData.id}`
      : null;

    const isRich = containerWidth >= 400;
    const allProviders = [
      ...watchProviders.stream,
      ...watchProviders.rent,
      ...watchProviders.buy,
    ];
    // Deduplicate providers by id
    const uniqueProviders = allProviders.filter(
      (p, i, arr) => arr.findIndex((x) => x.provider_id === p.provider_id) === i
    );

    if (isRich) {
      return (
        <RichCard
          title={title}
          tagline={tagline}
          year={year}
          runtime={runtime}
          seasonInfo={seasonInfo}
          mediaType={mediaType}
          rating={rating}
          voteCount={voteCount}
          genres={genres}
          overview={overview}
          poster={poster}
          backdrop={backdrop}
          director={director}
          writers={writers}
          cast={cast}
          watchlistItem={watchlistItem}
          watchProviders={uniqueProviders}
          watchProvidersLink={watchProviders.link}
          cinemaUrl={cinemaUrl}
          hasSession={!!session}
        />
      );
    }

    // Compact fallback for narrow containers
    return (
      <CompactCard
        title={title}
        year={year}
        runtime={runtime}
        seasonInfo={seasonInfo}
        mediaType={mediaType}
        rating={rating}
        voteCount={voteCount}
        genres={genres}
        overview={overview}
        poster={poster}
        director={director}
        cast={cast}
        watchlistItem={watchlistItem}
        cinemaUrl={cinemaUrl}
        hasSession={!!session}
      />
    );
  } catch (err) {
    return (
      <CardError
        message={`Failed to load: ${err instanceof Error ? err.message : "Unknown error"}`}
      />
    );
  }
}

/* ─── Rich Card (w >= 400) ────────────────────────────────── */

function RichCard({
  title,
  tagline,
  year,
  runtime,
  seasonInfo,
  mediaType,
  rating,
  voteCount,
  genres,
  overview,
  poster,
  backdrop,
  director,
  writers,
  cast,
  watchlistItem,
  watchProviders,
  watchProvidersLink,
  cinemaUrl,
  hasSession,
}: {
  title: string;
  tagline: string;
  year: string;
  runtime: string | null;
  seasonInfo: string | null;
  mediaType: string;
  rating: string | null;
  voteCount: number;
  genres: string[];
  overview: string;
  poster: string | null;
  backdrop: string | null;
  director: string | undefined;
  writers: string[];
  cast: Array<{ name: string; character: string; profile_path: string | null }>;
  watchlistItem: WatchlistItem | null;
  watchProviders: WatchProvider[];
  watchProvidersLink?: string;
  cinemaUrl: string | null;
  hasSession: boolean;
}) {
  return (
    <div className="overflow-hidden bg-card text-foreground">
      {/* Backdrop hero */}
      <div className="relative">
        {backdrop ? (
          <div className="relative h-56 w-full overflow-hidden">
            <img
              src={backdrop}
              alt=""
              className="h-full w-full object-cover object-top"
            />
            {/* Gradient overlays — cinematic fade to card */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-card/5" />
            <div className="absolute inset-0 bg-gradient-to-r from-card/70 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-36 w-full bg-muted" />
        )}
      </div>

      {/* Content area */}
      <div className="relative px-5 pb-5">
        {/* Poster + Title row — poster overlaps backdrop */}
        <div className="flex gap-4">
          {poster && (
            <div className="-mt-24 shrink-0 relative z-10">
              <img
                src={poster}
                alt={title}
                className="w-28 h-[168px] rounded-lg object-cover shadow-xl ring-2 ring-card dark:shadow-black/40"
              />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-2">
            <h2 className="text-lg font-bold text-foreground leading-tight">
              {title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {runtime && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {runtime}
                  </span>
                </>
              )}
              {seasonInfo && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Tv className="h-3.5 w-3.5" />
                    {seasonInfo}
                  </span>
                </>
              )}
              {!seasonInfo && (
                mediaType === "tv" ? (
                  <Tv className="h-3.5 w-3.5 ml-0.5" />
                ) : (
                  <Film className="h-3.5 w-3.5 ml-0.5" />
                )
              )}
            </div>

            {/* Rating */}
            {rating && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1 dark:bg-amber-500/20 dark:shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold text-foreground">{rating}</span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
                {voteCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {voteCount > 1000 ? `${(voteCount / 1000).toFixed(1)}K` : voteCount} votes
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tagline */}
        {tagline && (
          <p className="mt-3 text-sm italic text-muted-foreground/80">
            &ldquo;{tagline}&rdquo;
          </p>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <span
                key={g}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-transparent dark:border-border"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Watchlist badge */}
        {watchlistItem && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <BookmarkCheck className="h-3.5 w-3.5" />
            {watchlistItem.status === "watched" ? "Watched" : "In Watchlist"}
            {watchlistItem.user_rating && (
              <span className="ml-1 text-muted-foreground">
                — rated {watchlistItem.user_rating}/10
              </span>
            )}
          </div>
        )}

        {/* Overview */}
        {overview && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Overview
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">
              {overview}
            </p>
          </div>
        )}

        {/* Director + Writers */}
        {(director || writers.length > 0) && (
          <div className="mt-4 space-y-1 text-sm">
            {director && (
              <p>
                <span className="font-medium text-foreground">Director</span>{" "}
                <span className="text-muted-foreground">{director}</span>
              </p>
            )}
            {writers.length > 0 && (
              <p>
                <span className="font-medium text-foreground">
                  {writers.length === 1 ? "Writer" : "Writers"}
                </span>{" "}
                <span className="text-muted-foreground">{writers.join(", ")}</span>
              </p>
            )}
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Cast
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {cast.map((c) => (
                <div key={c.name} className="flex items-center gap-2 min-w-0">
                  {c.profile_path ? (
                    <img
                      src={`/api/tmdb/image/t/p/w45${c.profile_path}`}
                      alt={c.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center ring-1 ring-border">
                      <svg className="w-4 h-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 text-sm">
                    <span className="font-medium text-foreground block truncate leading-tight">{c.name}</span>
                    {c.character && (
                      <span className="text-muted-foreground text-xs block truncate leading-tight">
                        {c.character}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watch Providers */}
        {watchProviders.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Where to Watch
            </h3>
            <div className="flex flex-wrap gap-2">
              {watchProviders.map((p) => (
                <div
                  key={p.provider_id}
                  className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 border border-transparent dark:border-border"
                  title={p.provider_name}
                >
                  {p.logo_path && (
                    <img
                      src={`/api/tmdb/image/t/p/w45${p.logo_path}`}
                      alt={p.provider_name}
                      className="h-6 w-6 rounded-md"
                    />
                  )}
                  <span className="text-xs font-medium text-foreground">{p.provider_name}</span>
                </div>
              ))}
            </div>
            {watchProvidersLink && (
              <a
                href={watchProvidersLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                via JustWatch
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-5 flex gap-2.5">
          {cinemaUrl && (
            <a
              href={cinemaUrl}
              target="_top"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md"
            >
              <Play className="h-4 w-4" />
              View in Cinema
            </a>
          )}
          {!watchlistItem && hasSession && cinemaUrl && (
            <a
              href={`${cinemaUrl}?action=add-watchlist`}
              target="_top"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all hover:shadow-sm"
            >
              <Bookmark className="h-4 w-4" />
              Add to Watchlist
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Compact Card (w < 400) ──────────────────────────────── */

function CompactCard({
  title,
  year,
  runtime,
  seasonInfo,
  mediaType,
  rating,
  voteCount,
  genres,
  overview,
  poster,
  director,
  cast,
  watchlistItem,
  cinemaUrl,
  hasSession,
}: {
  title: string;
  year: string;
  runtime: string | null;
  seasonInfo: string | null;
  mediaType: string;
  rating: string | null;
  voteCount: number;
  genres: string[];
  overview: string;
  poster: string | null;
  director: string | undefined;
  cast: Array<{ name: string; character: string; profile_path: string | null }>;
  watchlistItem: WatchlistItem | null;
  cinemaUrl: string | null;
  hasSession: boolean;
}) {
  return (
    <div className="p-3">
      {/* Accent line */}
      <div className="h-0.5 w-12 rounded-full bg-amber-500/60 mb-3" />

      {/* Poster + Title row */}
      <div className="flex gap-3">
        {poster && (
          <img
            src={poster}
            alt={title}
            className="w-24 h-36 rounded-lg object-cover shadow-md shrink-0 dark:shadow-black/30"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground leading-tight line-clamp-2">
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
            {(runtime || seasonInfo) && (
              <>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {runtime || seasonInfo}
                </span>
              </>
            )}
            {mediaType === "tv" ? (
              <Tv className="h-3 w-3 ml-0.5" />
            ) : (
              <Film className="h-3 w-3 ml-0.5" />
            )}
          </div>
          {rating && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 dark:bg-amber-500/20">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-foreground">{rating}</span>
              <span className="text-[10px] text-muted-foreground">/10</span>
            </div>
          )}
          {watchlistItem && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <BookmarkCheck className="h-3 w-3" />
              {watchlistItem.status === "watched" ? "Watched" : "In Watchlist"}
            </div>
          )}
        </div>
      </div>
      {genres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {genres.slice(0, 4).map((g) => (
            <span key={g} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-transparent dark:border-border">
              {g}
            </span>
          ))}
        </div>
      )}
      {overview && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground line-clamp-4">{overview}</p>
      )}
      <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
        {director && (
          <p><span className="font-medium text-foreground">Director:</span> {director}</p>
        )}
        {cast.length > 0 && (
          <p><span className="font-medium text-foreground">Cast:</span> {cast.map((c) => c.name).join(", ")}</p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {cinemaUrl && (
          <a href={cinemaUrl} target="_top" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-md">
            <Film className="h-3 w-3" />
            View in Cinema
          </a>
        )}
        {!watchlistItem && hasSession && cinemaUrl && (
          <a href={`${cinemaUrl}?action=add-watchlist`} target="_top" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-all hover:shadow-sm">
            <Bookmark className="h-3 w-3" />
            Add to Watchlist
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Shared components ───────────────────────────────────── */

function CardError({ message }: { message: string }) {
  return (
    <div className="p-3">
      <p className="text-xs text-muted-foreground py-4 text-center">{message}</p>
    </div>
  );
}
