import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, getOne } from "@/lib/db/client";
import { clearApiKeyCache } from "@/lib/tmdb/client";
import { internetFetch } from "@/lib/internet";

/**
 * GET /api/settings/api-key
 * Returns whether an API key is configured (never returns the full key).
 */
export async function GET() {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const row = await getOne<{ value: string }>(
      `SELECT value FROM app_config WHERE key = 'tmdb_api_key'`,
      []
    );
    const hasKey = !!row?.value;
    const hasEnvKey = !!process.env.TMDB_API_KEY;
    return NextResponse.json({
      configured: true, // Always true — built-in key ships with the app
      source: hasKey ? "settings" : hasEnvKey ? "environment" : "built-in",
      // Show last 4 chars masked for confirmation
      masked: hasKey
        ? `${"*".repeat(Math.max(0, row!.value.length - 4))}${row!.value.slice(-4)}`
        : hasEnvKey
          ? `${"*".repeat(Math.max(0, process.env.TMDB_API_KEY!.length - 4))}${process.env.TMDB_API_KEY!.slice(-4)}`
          : "built-in",
    });
  } catch {
    return NextResponse.json({ configured: false, source: "none", masked: null });
  }
}

/**
 * PUT /api/settings/api-key
 * Save or update the TMDB API key. Validates against TMDB before saving.
 */
export async function PUT(request: Request) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const apiKey = (body.apiKey || "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  // Validate the key against TMDB
  try {
    const res = await internetFetch(
      `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(apiKey)}`,
      {},
      session.userId,
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.status_message || "Invalid API key — TMDB rejected it" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not reach TMDB to validate key. Check internet access." },
      { status: 502 }
    );
  }

  // Save to database
  await query(
    `INSERT INTO app_config (key, value, updated_at) VALUES ('tmdb_api_key', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [apiKey]
  );

  clearApiKeyCache();

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/settings/api-key
 * Remove the stored API key (falls back to env var if set).
 */
export async function DELETE() {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query(`DELETE FROM app_config WHERE key = 'tmdb_api_key'`);
  clearApiKeyCache();

  return NextResponse.json({ success: true });
}
