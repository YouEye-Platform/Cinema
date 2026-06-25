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
  voteAverage: number | null
): Promise<void> {
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `viewed:${mediaType}:${tmdbId}`, "history", {
    app_id: "cinema",
    entry_type: `cinema-${mediaType}-viewed`,
    title: `Viewed: ${title}`,
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
  voteAverage: number | null
): Promise<void> {
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `watched:${mediaType}:${tmdbId}`, "history", {
    app_id: "cinema",
    entry_type: `cinema-${mediaType}-watched`,
    title: `Watched: ${title}`,
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
  year: string
): Promise<void> {
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `added:${mediaType}:${tmdbId}`, "history", {
    app_id: "cinema",
    entry_type: "cinema-watchlist-add",
    title: `Added to watchlist: ${title}`,
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=watchlist-add`,
    tags: { tmdb_id: String(tmdbId), media_type: mediaType },
    data: {
      description: `Added ${title} (${year}) to watchlist`,
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
  year: string
): Promise<void> {
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
  const statusLabels: Record<string, string> = {
    "want-to-watch": "Want to Watch",
    watching: "Watching",
    watched: "Watched",
    dropped: "Dropped",
  };
  const statusLabel = statusLabels[status] || status;

  await emitIfNotDebounced(userId, `status:${mediaType}:${tmdbId}:${status}`, "history", {
    app_id: "cinema",
    entry_type: "cinema-status-change",
    title: `${statusLabel}: ${title}`,
    embed_path: `/embed/timeline/movie?id=${tmdbId}&type=${mediaType}&action=status-change&status=${status}`,
    tags: { tmdb_id: String(tmdbId), media_type: mediaType, status },
    data: {
      description: `Marked ${title} as "${statusLabel}"`,
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
  year: string
): Promise<void> {
  const posterUrl = getImageUrl(posterPath, "w342");
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;

  await emitIfNotDebounced(userId, `review:${mediaType}:${tmdbId}`, "history", {
    app_id: "cinema",
    entry_type: "cinema-review",
    title: `Reviewed: ${title}`,
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
  resultCount: number
): Promise<void> {
  await emitIfNotDebounced(userId, `search:${query}`, "history", {
    app_id: "cinema",
    entry_type: "cinema-search",
    title: `Searched Cinema: "${query}"`,
    embed_path: `/embed/timeline/search?q=${encodeURIComponent(query)}`,
    tags: { result_count: String(resultCount) },
    data: {
      description: `${resultCount} result${resultCount !== 1 ? "s" : ""} found`,
      query,
      result_count: resultCount,
    },
  });
}
