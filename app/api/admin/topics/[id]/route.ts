import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const row = db
    .prepare<[string], { id: string }>('SELECT id FROM topics WHERE id = ?')
    .get(params.id);
  if (!row) {
    return NextResponse.json({ error: 'Thema nicht gefunden' }, { status: 404 });
  }
  db.prepare('UPDATE topics SET removed = 1 WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
