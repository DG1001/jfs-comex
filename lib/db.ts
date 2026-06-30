import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let db: Database.Database | null = null;

export function dbPath(): string {
  return (
    process.env.BOF_DB_PATH ?? path.join(process.cwd(), 'data', 'bof.sqlite')
  );
}

export function getDb(): Database.Database {
  if (db) return db;
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

/**
 * Schließt die Singleton-Connection. Nächstes `getDb()` öffnet sie neu —
 * gedacht für den Restore-Endpoint, der die DB-Datei austauschen will.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      owner_name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      preferred_slots TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      removed INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_topics_removed ON topics(removed);
    CREATE INDEX IF NOT EXISTS idx_topics_owner ON topics(owner_id);

    CREATE TABLE IF NOT EXISTS interests (
      topic_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (topic_id, participant_id),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_interests_participant ON interests(participant_id);

    CREATE TABLE IF NOT EXISTS assignments (
      slot_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      meeting_point_id TEXT,
      matched_at INTEGER NOT NULL,
      PRIMARY KEY (slot_id, topic_id),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_slot ON assignments(slot_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_topic ON assignments(topic_id);

    CREATE TABLE IF NOT EXISTS slot_matched (
      slot_id TEXT PRIMARY KEY,
      matched_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      participant_id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      claimed_at INTEGER NOT NULL,
      password_hash TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_name_nocase
      ON participants(name COLLATE NOCASE);

    -- Overlay für Treffpunkt-Koordinaten. Fehlt ein Eintrag, gilt der Wert
    -- aus config.yaml. So bleibt die Config Single-Source-of-Truth für
    -- Namen/Kapazität/Slots, und Positionsänderungen im Admin überleben
    -- Deploys (DB ist gemountet).
    CREATE TABLE IF NOT EXISTS meeting_point_positions (
      meeting_point_id TEXT PRIMARY KEY,
      x REAL NOT NULL,
      y REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Overlay für Slot-Verfügbarkeit pro Treffpunkt (z.B. Außenbereich nur
    -- bei gutem Wetter aktiv). Fehlt ein Eintrag, gilt der Wert aus
    -- config.yaml.
    CREATE TABLE IF NOT EXISTS meeting_point_slots (
      meeting_point_id TEXT PRIMARY KEY,
      slots_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Admin → Teilnehmer Nachrichten (Ein-Wege-Kanal mit optionaler
    -- Kurz-Antwort vom Teilnehmer). Status: 'unread' bis der User reagiert,
    -- danach 'replied' (mit reply_body) oder 'dismissed' (= kommt am
    -- Info-Stand vorbei). Solange 'unread', wird das Modal beim Teilnehmer
    -- bei jedem Refresh wieder geöffnet.
    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_participant_id TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      reply_body TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      FOREIGN KEY (recipient_participant_id) REFERENCES participants(participant_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient
      ON admin_messages(recipient_participant_id, status);
    CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);

    -- Backfill: bestehende Teilnehmer als Namens-Inhaber übernehmen.
    -- INSERT OR IGNORE: bei Namens-Kollisionen im Altbestand gewinnt der
    -- zuerst eingefügte Eintrag (Topic-Owner vor beliebigem Interesse-Eintrag).
    INSERT OR IGNORE INTO participants (participant_id, name, claimed_at)
      SELECT owner_id, owner_name, created_at FROM topics;
    INSERT OR IGNORE INTO participants (participant_id, name, claimed_at)
      SELECT participant_id, participant_name, MIN(joined_at)
      FROM interests
      GROUP BY participant_id;
  `);

  // Spalte password_hash für bestehende DBs nachrüsten (idempotent).
  const participantCols = d
    .prepare('PRAGMA table_info(participants)')
    .all() as Array<{ name: string }>;
  if (!participantCols.some(c => c.name === 'password_hash')) {
    d.exec('ALTER TABLE participants ADD COLUMN password_hash TEXT');
  }
}
