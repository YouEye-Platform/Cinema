import { useTranslations as useInterfaceTranslations } from "next-intl";
import { getLocale, getTranslations as getInterfaceTranslations } from "next-intl/server";
/**
 * Cinema Timeline Embed — Movie/TV Card
 *
 * Compact card rendered as iframe inside YE-UI timeline entries.
 * All data derived from URL params — no server-side storage needed.
 *
 * Query params:
 *   ?id=550          — TMDB ID
 *   &type=movie      — "movie" or "tv"
 *   &action=viewed   — "viewed", "watchlist-add", "status-change", "review"
 *   &status=watched  — (optional) watchlist status for status-change
 *   &rating=8        — (optional) user rating for review action
 *
 * Fetches fresh data from TMDB cache, renders a compact card,
 * and sends postMessage ready + resize signals to parent.
 */

import { tmdbFetch, getImageUrl } from "@/lib/tmdb/client";
import { runMigrations } from "@/lib/db/migrate";
import { Star, Clock, Film, Tv, Eye, ListPlus, Play, Pencil } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    id?: string;
    type?: string;
    action?: string;
    status?: string;
    rating?: string;
  }>;
}

interface TMDBData {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  runtime?: number;
  number_of_seasons?: number;
  genres?: Array<{ id: number; name: string }>;
}

const ACTION_LABELS: Record<string, { labelKey: string; icon: string; color: string }> = {
  viewed: { labelKey: "m1b28d17855a7", icon: "eye", color: "text-blue-500" },
  "watchlist-add": { labelKey: "mca54b78c57df", icon: "list-plus", color: "text-green-500" },
  "status-change": { labelKey: "mdf479f7b4508", icon: "film", color: "text-amber-500" },
  review: { labelKey: "mfad6057bb540", icon: "pencil", color: "text-purple-500" },
  watched: { labelKey: "m1ca8c1c0de6f", icon: "play", color: "text-emerald-500" },
};

const ACTION_ICONS: Record<string, typeof Film> = {
  eye: Eye,
  "list-plus": ListPlus,
  film: Film,
  pencil: Pencil,
  play: Play,
};

export default async function TimelineMoviePage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const translateInterface = await getInterfaceTranslations("interface");

  const params = await searchParams;
  const { id, type: mediaType = "movie", action = "viewed", status, rating } = params;

  if (!id) {
    return <ErrorCard message={translateInterface("m64e5bdfdbeac")} />;
  }

  await runMigrations();

  try {
    const data = (await tmdbFetch(`/${mediaType}/${id}`)) as unknown as TMDBData;

    const title = data.title || data.name || translateInterface("mb764cdc0eab7");
    const year = (data.release_date || data.first_air_date || "").slice(0, 4);
    const poster = getImageUrl(data.poster_path || null, "w185");
    const tmdbRating = data.vote_average ? data.vote_average.toLocaleString(locale, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : null;
    const runtime = data.runtime
      ? translateInterface("mcf8484035b7f", { hours: Math.floor(data.runtime / 60), minutes: data.runtime % 60 })
      : null;
    const seasonInfo = data.number_of_seasons
      ? translateInterface("m1789d2238e4e", { count: data.number_of_seasons })
      : null;
    const genres = (data.genres || []).slice(0, 3).map((g) => g.name);
    const overview = data.overview ? data.overview.slice(0, 120) + (data.overview.length > 120 ? "..." : "") : null;

    const actionInfo = ACTION_LABELS[action] || ACTION_LABELS.viewed;
    const ActionIcon = ACTION_ICONS[actionInfo.icon] || Eye;

    // Build status text for status-change entries
    let statusText = "";
    if (action === "status-change" && status) {
      const statusLabels: Record<string, string> = {
        "want-to-watch": translateInterface("m02e740aaf70d"),
        watching: "Watching",
        watched: "m1ca8c1c0de6f",
        dropped: "Dropped",
      };
      statusText = statusLabels[status] || status;
    }

    const cinemaBaseUrl =
      process.env.CINEMA_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const cinemaUrl = cinemaBaseUrl
      ? `${cinemaBaseUrl}/${mediaType}/${data.id}`
      : null;

    return (
      <div className="p-2.5">
        <div className="flex gap-3">
          {/* Poster */}
          {poster && (
            <img
              src={poster}
              alt={title}
              className="w-12 h-[72px] rounded object-cover shadow-sm shrink-0"
            />
          )}

          <div className="min-w-0 flex-1">
            {/* Action badge */}
            <div className="flex items-center gap-1.5 mb-1">
              <ActionIcon className={`h-3.5 w-3.5 ${actionInfo.color}`} />
              <span className={`text-[11px] font-medium ${actionInfo.color}`}>
                {translateInterface(actionInfo.labelKey)}
                {statusText && ` → ${statusText}`}
              </span>
            </div>

            {/* Title + year */}
            <div className="flex items-baseline gap-1.5">
              {cinemaUrl ? (
                <a
                  href={cinemaUrl}
                  target="_top"
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                >
                  {title}
                </a>
              ) : (
                <span className="text-sm font-semibold text-foreground truncate">
                  {title}
                </span>
              )}
              {year && (
                <span className="text-xs text-muted-foreground shrink-0">({year})</span>
              )}
            </div>

            {/* Meta line: type, runtime, rating */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
              {mediaType === "tv" ? (
                <span className="inline-flex items-center gap-0.5">
                  <Tv className="h-3 w-3" />
                  {seasonInfo || translateInterface("mca62d5e073f5")}
                </span>
              ) : (
                runtime && (
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {runtime}
                  </span>
                )
              )}
              {tmdbRating && (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  {tmdbRating}
                </span>
              )}
              {rating && (
                <span className="inline-flex items-center gap-0.5 text-purple-500">
                  {translateInterface("m30b17903f713")}{" "}{rating}/10
                </span>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-muted px-1.5 py-0 text-[10px] text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Overview snippet */}
            {overview && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {overview}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    return <ErrorCard message={translateInterface("m5232c0639543")} />;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="p-2.5">
      <p className="text-xs text-muted-foreground py-2 text-center">{message}</p>
    </div>
  );
}
