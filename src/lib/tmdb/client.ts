import { query, getOne } from "@/lib/db/client";
import { internetFetch } from "@/lib/internet";

const TMDB_BASE = "https://api.themoviedb.org/3";

// Built-in API key — works out of the box for the starter experience.
// Users can override via DB (settings page) or TMDB_API_KEY env var.
const BUILTIN_API_KEY = "52af8f32a78f28304d4bbbba71a327f5";

// In-memory cache for the API key (avoid DB hit every request)
let cachedApiKey: string | null = null;
let apiKeyCachedAt = 0;
const API_KEY_CACHE_TTL = 60_000; // 1 minute

async function getApiKey(): Promise<string> {
  // Return cached if fresh
  if (cachedApiKey && Date.now() - apiKeyCachedAt < API_KEY_CACHE_TTL) {
    return cachedApiKey;
  }
  // Try DB first (user-configured key takes priority)
  try {
    const row = await getOne<{ value: string }>(
      `SELECT value FROM app_config WHERE key = 'tmdb_api_key'`,
      []
    );
    if (row?.value) {
      cachedApiKey = row.value;
      apiKeyCachedAt = Date.now();
      return cachedApiKey;
    }
  } catch {
    // DB not ready or table doesn't exist yet
  }
  // Then env var, then built-in key
  return process.env.TMDB_API_KEY || BUILTIN_API_KEY;
}

/** Clear the cached API key (call after saving a new key) */
export function clearApiKeyCache(): void {
  cachedApiKey = null;
  apiKeyCachedAt = 0;
}

// Cache TTLs in seconds
const TTL = {
  details: 60 * 60 * 24,       // 24 hours
  trending: 60 * 60,            // 1 hour
  search: 60 * 60,              // 1 hour
  popular: 60 * 60 * 6,         // 6 hours
  topRated: 60 * 60 * 6,        // 6 hours
};

function getTTL(path: string): number {
  if (path.includes("/trending/")) return TTL.trending;
  if (path.includes("/search/")) return TTL.search;
  if (path.includes("/popular") || path.includes("/upcoming")) return TTL.popular;
  if (path.includes("/top_rated")) return TTL.topRated;
  return TTL.details;
}

export async function tmdbFetch(
  path: string,
  params?: Record<string, string>,
  userId?: string,
): Promise<Record<string, unknown>> {
  const apiKey = await getApiKey();

  const queryParams = new URLSearchParams({ api_key: apiKey, ...(params ?? {}) });
  const cacheKey = `${path}?${queryParams.toString()}`;

  // Check cache
  try {
    const cached = await getOne<{ data: Record<string, unknown>; expires_at: string }>(
      `SELECT data, expires_at FROM tmdb_cache WHERE cache_key = $1`,
      [cacheKey]
    );
    if (cached && new Date(cached.expires_at) > new Date()) {
      return cached.data as Record<string, unknown>;
    }
  } catch {
    // Cache miss or DB error — proceed to fetch
  }

  // Fetch from TMDB
  const url = `${TMDB_BASE}${path}?${queryParams.toString()}`;
  const res = await internetFetch(url, { next: { revalidate: 0 } }, userId);
  if (!res.ok) throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as Record<string, unknown>;

  // Store in cache
  const ttl = getTTL(path);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  try {
    await query(
      `INSERT INTO tmdb_cache (cache_key, data, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (cache_key) DO UPDATE SET data = $2, expires_at = $3, fetched_at = NOW()`,
      [cacheKey, JSON.stringify(data), expiresAt]
    );
  } catch {
    // Non-critical cache write failure
  }

  return data;
}

export async function clearExpiredCache(): Promise<void> {
  try {
    await query(`DELETE FROM tmdb_cache WHERE expires_at < NOW()`);
  } catch {
    // Non-critical
  }
}

export function getImageUrl(imagePath: string | null, size: string): string | null {
  if (!imagePath) return null;
  return `/api/tmdb/image/t/p/${size}${imagePath}`;
}
