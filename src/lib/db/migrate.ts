import { query } from "./client";

let migrated = false;

export async function runMigrations(): Promise<void> {
  if (migrated) return;

  // TMDB response cache
  await query(`
    CREATE TABLE IF NOT EXISTS tmdb_cache (
      cache_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      fetched_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_tmdb_cache_expires ON tmdb_cache(expires_at)`);

  // User watchlists
  await query(`
    CREATE TABLE IF NOT EXISTS watchlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_default BOOLEAN DEFAULT false,
      is_shared BOOLEAN DEFAULT false,
      share_token TEXT UNIQUE,
      is_published BOOLEAN DEFAULT false,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_watchlists_share_token ON watchlists(share_token) WHERE share_token IS NOT NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_watchlists_published ON watchlists(is_published) WHERE is_published = true`);

  // Watchlist items
  await query(`
    CREATE TABLE IF NOT EXISTS watchlist_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
      tmdb_id INT NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      status TEXT DEFAULT 'want_to_watch' CHECK (status IN ('want_to_watch', 'watching', 'watched', 'dropped')),
      user_rating SMALLINT CHECK (user_rating >= 1 AND user_rating <= 10),
      review_text TEXT DEFAULT '',
      watched_at TIMESTAMPTZ,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, tmdb_id, media_type)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_items_user ON watchlist_items(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_items_watchlist ON watchlist_items(watchlist_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_items_tmdb ON watchlist_items(tmdb_id, media_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_items_status ON watchlist_items(user_id, status)`);

  // App-level config (instance settings like API keys)
  await query(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // User preferences
  await query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      tmdb_region TEXT DEFAULT 'US',
      include_adult BOOLEAN DEFAULT false,
      default_watchlist_id UUID REFERENCES watchlists(id) ON DELETE SET NULL
    )
  `);

  migrated = true;
}

export async function ensureDefaultWatchlist(userId: string): Promise<void> {
  const existing = await query(
    `SELECT id FROM watchlists WHERE user_id = $1 AND is_default = true LIMIT 1`,
    [userId]
  );
  if (existing.rows.length === 0) {
    await query(
      `INSERT INTO watchlists (user_id, name, description, is_default)
       VALUES ($1, 'My Watchlist', 'Your default watchlist', true)
       ON CONFLICT DO NOTHING`,
      [userId]
    );
  }
}
