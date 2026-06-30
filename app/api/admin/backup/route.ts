import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Erzeugt einen konsistenten Snapshot der SQLite-DB (Online-Backup-API von
 * SQLite — WAL-konsistent ohne Pause der Anwendung) und liefert ihn als
 * Download.
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const tmp = path.join('/tmp', `comex-backup-${Date.now()}-${process.pid}.sqlite`);
  try {
    await getDb().backup(tmp);
    const buf = fs.readFileSync(tmp);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="comex-backup-${date}.sqlite"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Backup fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 },
    );
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* schon weg */
    }
  }
}
