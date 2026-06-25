import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { clearExpiredCache } from "@/lib/tmdb/client";
import packageJson from "../../../../package.json";

const startTime = Date.now();
let dbReady = false;

export async function GET() {
  if (!dbReady) {
    try {
      await runMigrations();
      dbReady = true;
    } catch {
      // DB not available yet
    }
  }

  // Periodically clear expired cache (best-effort)
  if (dbReady) {
    clearExpiredCache().catch(() => {});
  }

  return NextResponse.json({
    status: "ok",
    app: "ye-cinema",
    version: packageJson.version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbReady ? "connected" : "pending",
  });
}
