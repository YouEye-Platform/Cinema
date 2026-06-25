import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  const current = await query(
    `SELECT is_published FROM watchlists WHERE id = $1 AND user_id = $2`,
    [id, session.userId]
  );
  if (current.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newPublished = !(current.rows[0].is_published as boolean);
  const result = await query(
    `UPDATE watchlists SET is_published = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING is_published`,
    [newPublished, id, session.userId]
  );
  return NextResponse.json({ watchlist: result.rows[0] });
}
