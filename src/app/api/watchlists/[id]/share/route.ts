import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

function generateShareToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  // Toggle sharing
  const current = await query(
    `SELECT is_shared, share_token FROM watchlists WHERE id = $1 AND user_id = $2`,
    [id, session.userId]
  );
  if (current.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wasShared = current.rows[0].is_shared as boolean;
  const newShared = !wasShared;
  const shareToken = newShared
    ? (current.rows[0].share_token as string | null) || generateShareToken()
    : null;

  const result = await query(
    `UPDATE watchlists SET is_shared = $1, share_token = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING is_shared, share_token`,
    [newShared, shareToken, id, session.userId]
  );
  return NextResponse.json({ watchlist: result.rows[0] });
}
