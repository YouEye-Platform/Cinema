import { getActivityTranslator } from "@/i18n/activity";
/**
 * Cinema Timeline Event Emitters
 *
 * Posts timeline entries to YE-UI for every significant user action.
 * Each entry includes:
 *   - embed_path: lean URL for rich iframe card in timeline
 *   - data: standard structured content (description, thumbnail_url, url, etc.)
 *   - tags: machine-readable metadata for filtering/MCP/AI
 *
 * Debounced per userId+key to prevent duplicate entries.
 * Capture time before locale lookup; callers may supply an earlier action time.
 */

import { createApiClient } from "@/lib/api";
import { getImageUrl } from "@/lib/tmdb/client";

const api = createApiClient("ye-cinema");
const postTimelineEntry = api.postTimelineEntry.bind(api);

// Debounce map: userId+itemKey → last emit timestamp
const emitDebounce = new Map<string, number>();
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

async function emitIfNotDebounced(
  userId: string,
  key: string,
  collection: string,
  entry: Record<string, unknown>
): Promise<void> {
  const debounceKey = `${userId}:${key}`;
  const last = emitDebounce.get(debounceKey) ?? 0;
  if (Date.now() - last < DEBOUNCE_MS) return;
  emitDebounce.set(debounceKey, Date.now());
  try {
    await postTimelineEntry(userId, collection, entry);
  } catch {
    // Timeline is best-effort — don't break the caller
  }
}

// ─── Movie/TV Viewed (opened the detail page) ───────────────────

export async function emitMovieViewed(
  userId: string,
  tmdbId: number,
  mediaType: string,
  title: string,
  overview: string,
  posterPath: string | null,
  year: string,
  voteAverage: number | null,
  timestamp: string = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `viewed:${mediaType}:${tmdbId}`, "history", {
    timestamp,
    app_id: "cinema",
    entry_type: `cinema-${mediaType}-viewed`,
    title: t("m1e8d52f94988", {title}),
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=viewed`,
    tags: { tmdb_id: String(tmdbId), media_type: mediaType },
    data: {
      description: overview.slice(0, 200),
      thumbnail_url: posterUrl,
      url: tmdbUrl,
      tmdb_id: tmdbId,
      media_type: mediaType,
      year,
      vote_average: voteAverage,
    },
  });
}

// ─── Movie/TV Watched (marked as watched) ────────────────────────

export async function emitMovieWatched(
  userId: string,
  tmdbId: number,
  mediaType: string,
  title: string,
  overview: string,
  posterPath: string | null,
  rating: number | null,
  year: string,
  voteAverage: number | null,
  timestamp: string = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `watched:${mediaType}:${tmdbId}`, "history", {
    timestamp,
    app_id: "cinema",
    entry_type: `cinema-${mediaType}-watched`,
    title: t("m3be7ba22bc33", {title}),
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=watched` +
      (rating ? `&rating=${rating}` : ""),
    tags: {
      tmdb_id: String(tmdbId),
      media_type: mediaType,
      ...(rating ? { user_rating: String(rating) } : {}),
    },
    data: {
      description: overview.slice(0, 200),
      thumbnail_url: posterUrl,
      url: tmdbUrl,
      tmdb_id: tmdbId,
      media_type: mediaType,
      year,
      vote_average: voteAverage,
      user_rating: rating,
    },
  });
}

// ─── Added to Watchlist ──────────────────────────────────────────

export async function emitAddedToWatchlist(
  userId: string,
  tmdbId: number,
  mediaType: string,
  title: string,
  posterPath: string | null,
  year: string,
  timestamp: string = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `added:${mediaType}:${tmdbId}`, "history", {
    timestamp,
    app_id: "cinema",
    entry_type: "cinema-watchlist-add",
    title: t("m1396f921960f", {title}),
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=watchlist-add`,
    tags: { tmdb_id: String(tmdbId), media_type: mediaType },
    data: {
      description: t("m0f906198599d", {title, year}),
      thumbnail_url: posterUrl,
      url: tmdbUrl,
      tmdb_id: tmdbId,
      media_type: mediaType,
      year,
    },
  });
}

// ─── Status Change (want-to-watch, watching, dropped) ────────────

export async function emitStatusChange(
  userId: string,
  tmdbId: number,
  mediaType: string,
  title: string,
  status: string,
  posterPath: string | null,
  year: string,
  timestamp: string = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
  const statusLabels: Record<string, string> = {
    "want-to-watch": t("m02e740aaf70d"),
    watching: t("mfbc594054d51"),
    watched: t("m1ca8c1c0de6f"),
    dropped: t("m739f68fe97ad"),
  };
  const statusLabel = statusLabels[status] || status;

  await emitIfNotDebounced(userId, `status:${mediaType}:${tmdbId}:${status}`, "history", {
    timestamp,
    app_id: "cinema",
    entry_type: "cinema-status-change",
    title: `${statusLabel}: ${title}`,
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=status-change&status=${status}`,
    tags: { tmdb_id: String(tmdbId), media_type: mediaType, status },
    data: {
      description: t("mc3f102e7c4f1", {title, status: statusLabel}),
      thumbnail_url: posterUrl,
      url: tmdbUrl,
      tmdb_id: tmdbId,
      media_type: mediaType,
      year,
      status,
    },
  });
}

// ─── Review Posted ───────────────────────────────────────────────

export async function emitReviewPosted(
  userId: string,
  tmdbId: number,
  mediaType: string,
  title: string,
  reviewText: string,
  posterPath: string | null,
  rating: number | null,
  year: string,
  timestamp: string = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `review:${mediaType}:${tmdbId}`, "history", {
    timestamp,
    app_id: "cinema",
    entry_type: "cinema-review",
    title: t("m4f7b496884c6", {title}),
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=review` +
      (rating ? `&rating=${rating}` : ""),
    tags: {
      tmdb_id: String(tmdbId),
      media_type: mediaType,
      ...(rating ? { user_rating: String(rating) } : {}),
    },
    data: {
      description: reviewText.slice(0, 200),
      thumbnail_url: posterUrl,
      url: tmdbUrl,
      tmdb_id: tmdbId,
      media_type: mediaType,
      year,
      user_rating: rating,
      review_excerpt: reviewText.slice(0, 200),
    },
  });
}

// ─── Cinema Search ───────────────────────────────────────────────

export async function emitCinemaSearch(
  userId: string,
  query: string,
  resultCount: number,
  timestamp: string = new Date().toISOString()
): Promise<void> {
  const { t } = await getActivityTranslator(userId);
  await emitIfNotDebounced(userId, `search:${query}`, "history", {
    timestamp,
    app_id: "cinema",
    entry_type: "cinema-search",
    title: t("md35ed4d4c5f3", {query}),
    embed_path: `/embed/timeline/search?q=${encodeURIComponent(query)}`,
    tags: { result_count: String(resultCount) },
    data: {
      description: t("m1f6c1117aefc", {count: resultCount}),
      query,
      result_count: resultCount,
    },
  });
}
