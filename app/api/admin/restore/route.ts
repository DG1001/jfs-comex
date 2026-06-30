import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getDb, closeDb, dbPath } from '@/lib/db';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Sanity-Check: das hochgeladene File muss diese Kerntabellen haben,
// sonst ist es kein COMEX-Backup. Slot-Identitäten leben in config.yaml,
// nicht in der DB — daher hier nicht in der Liste.
const REQUIRED_TABLES = [
  'participants',
  'topics',
  'interests',
  'assignments',
];

/**
 * Ersetzt die laufende DB durch die hochgeladene SQLite-Datei.
 *
 * Ablauf:
 *  1. Hochgeladene Datei nach /tmp schreiben.
 *  2. In ReadOnly öffnen und prüfen, dass es eine gültige SQLite-DB mit den
 *     erwarteten Tabellen ist.
 *  3. Vor dem Tausch: automatisches Backup der jetzigen DB neben die
 *     Original-Datei (`bof-pre-restore-<timestamp>.sqlite`).
 *  4. Singleton schließen, Datei austauschen, WAL/SHM-Reste löschen.
 *  5. Nächste DB-Operation öffnet automatisch die neue Datei (Migration
 *     läuft idempotent über das neue Schema).
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  let upload: Blob | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get('backup');
    if (f instanceof Blob) upload = f;
  } catch {
    return NextResponse.json(
      { error: 'Ungültiges Formular — bitte Datei als multipart/form-data senden.' },
      { status: 400 },
    );
  }
  if (!upload) {
    return NextResponse.json(
      { error: 'Kein Upload-Feld "backup" gefunden.' },
      { status: 400 },
    );
  }
  if (upload.size === 0) {
    return NextResponse.json({ error: 'Datei ist leer.' }, { status: 400 });
  }
  if (upload.size > 200 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Datei zu groß (max. 200 MB).' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await upload.arrayBuffer());
  const tmpUpload = path.join(
    '/tmp',
    `comex-restore-upload-${Date.now()}-${process.pid}.sqlite`,
  );
  fs.writeFileSync(tmpUpload, buf);

  // 1. Validieren
  try {
    const probe = new Database(tmpUpload, { readonly: true, fileMustExist: true });
    const tables = (probe.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ).all() as Array<{ name: string }>).map(r => r.name);
    probe.close();
    const missing = REQUIRED_TABLES.filter(t => !tables.includes(t));
    if (missing.length > 0) {
      throw new Error(
        `Fehlende Tabellen: ${missing.join(', ')} — ist das wirklich ein COMEX-Backup?`,
      );
    }
  } catch (e) {
    try {
      fs.unlinkSync(tmpUpload);
    } catch {
      /* egal */
    }
    return NextResponse.json(
      { error: `Datei ungültig: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  // 2. Pre-Restore-Backup vom aktuellen Stand
  const target = dbPath();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const preBackup = path.join(
    path.dirname(target),
    `bof-pre-restore-${ts}.sqlite`,
  );
  try {
    await getDb().backup(preBackup);
  } catch (e) {
    try {
      fs.unlinkSync(tmpUpload);
    } catch {
      /* egal */
    }
    return NextResponse.json(
      { error: `Pre-Restore-Backup fehlgeschlagen, Restore abgebrochen: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // 3. Singleton schließen → Datei austauschen → WAL/SHM-Reste entfernen
  try {
    closeDb();
    fs.copyFileSync(tmpUpload, target);
    for (const ext of ['-wal', '-shm']) {
      const f = target + ext;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    fs.unlinkSync(tmpUpload);
  } catch (e) {
    return NextResponse.json(
      { error: `Datei-Tausch fehlgeschlagen: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // 4. Sofort wieder öffnen (löst Migration aus, falls Schema älter)
  try {
    getDb();
  } catch (e) {
    return NextResponse.json(
      {
        error: `DB öffnen nach Restore fehlgeschlagen: ${(e as Error).message}. Pre-Restore-Backup liegt unter ${path.basename(preBackup)}.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pre_restore_backup: path.basename(preBackup),
  });
}
