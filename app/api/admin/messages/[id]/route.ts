import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Löscht eine Nachricht (z.B. nachdem sie geklärt wurde). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
  }
  const res = getDb().prepare('DELETE FROM admin_messages WHERE id = ?').run(id);
  if (res.changes === 0) {
    return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
