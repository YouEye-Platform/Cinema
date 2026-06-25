import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne, getMany, query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  const watchlist = await getOne(
    `SELECT * FROM watchlists WHERE id = $1 AND user_id = $2`,
    [id, session.userId]
  );
  if (!watchlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await getMany(
    `SELECT * FROM watchlist_items WHERE watchlist_id = $1 ORDER BY added_at DESC`,
    [id]
  );
  return NextResponse.json({ watchlist, items });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  const body = await request.json();
  const { name, description, sort_order } = body;

  const result = await query(
    `UPDATE watchlists SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       sort_order = COALESCE($3, sort_order),
       updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [name, description, sort_order, id, session.userId]
  );
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ watchlist: result.rows[0] });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-cinema");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  // Prevent deleting the default watchlist
  const watchlist = await getOne(
    `SELECT is_default FROM watchlists WHERE id = $1 AND user_id = $2`,
    [id, session.userId]
  );
  if (!watchlist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (watchlist.is_default) return NextResponse.json({ error: "Cannot delete default watchlist" }, { status: 400 });

  await query(`DELETE FROM watchlists WHERE id = $1 AND user_id = $2`, [id, session.userId]);
  return NextResponse.json({ success: true });
}
