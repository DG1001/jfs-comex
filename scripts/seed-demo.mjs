// Demo-Daten für die BoF-App / Community Exchange.
//
// Legt einen kuratierten Satz Teilnehmer, Themen und Interessen an und stößt
// (best effort, falls der Dev-Server läuft) das Matching der ersten beiden
// Slots an. Bestehende Themen/Teilnehmer/Zuordnungen werden vorher entfernt.
//
//   node scripts/seed-demo.mjs
//
// DB-Pfad via BOF_DB_PATH überschreibbar; Admin-Token via BOF_ADMIN_TOKEN
// bzw. aus .env. Server-URL via BOF_BASE_URL (Default http://localhost:3000).

import Database from 'better-sqlite3';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Alle Demo-Teilnehmer erhalten dasselbe, bekannte Passwort — so lässt sich
// der Login bequem vorführen.
const DEMO_PASSWORD = 'jfs-demo';

// Erzeugt denselben Hash-Format-String wie lib/auth.ts (scrypt:salt:hash).
function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 32);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

const dbPath =
  process.env.BOF_DB_PATH ?? path.join(process.cwd(), 'data', 'bof.sqlite');
const baseUrl = process.env.BOF_BASE_URL ?? 'http://localhost:3000';

function adminToken() {
  if (process.env.BOF_ADMIN_TOKEN) return process.env.BOF_ADMIN_TOKEN;
  try {
    const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const m = env.match(/^BOF_ADMIN_TOKEN=(.*)$/m);
    if (m) return m[1].trim();
  } catch {
    /* keine .env — egal */
  }
  return '';
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const hasTopics = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='topics'")
  .get();
if (!hasTopics) {
  console.error(
    'DB-Schema fehlt. Bitte die App einmal starten (npm run dev), damit die ' +
      'Tabellen angelegt werden, und das Skript dann erneut ausführen.',
  );
  process.exit(1);
}

// --- Teilnehmer -------------------------------------------------------------
const participantNames = [
  'Anna Bauer',
  'Tobias Klein',
  'Sarah Wolf',
  'Markus Schneider',
  'Lena Hoffmann',
  'Jonas Richter',
  'Julia Neumann',
  'David Köhler',
  'Nina Frank',
  'Felix Brandt',
  'Carina Lang',
  'Stefan Vogel',
  'Miriam Sommer',
  'Pascal Huber',
];
const participants = participantNames.map(name => ({
  id: randomUUID().replace(/-/g, ''),
  name,
}));
const idByName = new Map(participants.map(p => [p.name, p.id]));

// --- Themen -----------------------------------------------------------------
// count = Gesamtzahl Interessenten inkl. Owner. < 3 (min_interested) bleibt
// bewusst unter der Matching-Schwelle.
const topicDefs = [
  {
    title: 'Virtual Threads in der Praxis',
    owner: 'Tobias Klein',
    count: 11,
    preferred: ['vormittag-1'],
    description:
      'Erfahrungsaustausch zu Project Loom: Wo bringen virtuelle Threads ' +
      'wirklich etwas — und wo nicht?',
  },
  {
    title: 'KI-Coding-Assistenten im Java-Alltag',
    owner: 'Sarah Wolf',
    count: 10,
    preferred: ['mittag-1', 'mittag-2'],
    description:
      'Copilot, Claude & Co. im Projekt: echter Produktivitätsgewinn oder ' +
      'neue Wartungsschulden?',
  },
  {
    title: 'Spring Boot 3 — Migration ohne Schmerzen',
    owner: 'Markus Schneider',
    count: 8,
    preferred: ['vormittag-2'],
    description:
      'Stolpersteine beim Umstieg auf Spring Boot 3 und Jakarta EE 10.',
  },
  {
    title: 'Modulith statt Microservices',
    owner: 'Lena Hoffmann',
    count: 7,
    preferred: [],
    description: 'Wann ein modularer Monolith die ehrlichere Wahl ist.',
  },
  {
    title: 'Testcontainers & realistische Integrationstests',
    owner: 'Jonas Richter',
    count: 6,
    preferred: [],
    description: 'Verlässliche Integrationstests ohne Mock-Wildwuchs.',
  },
  {
    title: 'Observability mit OpenTelemetry',
    owner: 'Julia Neumann',
    count: 5,
    preferred: [],
    description: 'Tracing, Metrics und Logs konsistent über Services hinweg.',
  },
  {
    title: 'Kotlin für Java-Teams',
    owner: 'David Köhler',
    count: 5,
    preferred: ['vormittag-1'],
    description: 'Sanfter Einstieg in Kotlin in bestehenden Java-Codebasen.',
  },
  {
    title: 'Records, Sealed Classes & Pattern Matching',
    owner: 'Nina Frank',
    count: 4,
    preferred: [],
    description:
      'Modernes Java: was die neuen Sprachfeatures im Alltag wirklich bringen.',
  },
  {
    title: 'GraalVM Native Image — lohnt sich das?',
    owner: 'Felix Brandt',
    count: 4,
    preferred: [],
    description:
      'Startup-Zeit gegen Build-Komplexität: Erfahrungsberichte gesucht.',
  },
  {
    title: 'Event-Driven mit Kafka',
    owner: 'Carina Lang',
    count: 3,
    preferred: ['nachmittag-1'],
    description: 'Patterns, Fallstricke und Schema-Evolution in der Praxis.',
  },
  {
    title: 'Build-Tools 2026: Maven vs. Gradle',
    owner: 'Stefan Vogel',
    count: 2,
    preferred: [],
    description:
      'Offener Schlagabtausch — welches Tool für welches Projekt? (Noch ' +
      'unter der Interessenten-Schwelle.)',
  },
  {
    title: 'Quarkus vs. Spring — Erfahrungsaustausch',
    owner: 'Miriam Sommer',
    count: 1,
    preferred: [],
    description:
      'Zwei Welten im Vergleich: wer hat was produktiv im Einsatz? (Sucht ' +
      'noch Mitstreiter.)',
  },
];

const base = Date.parse('2026-05-19T09:00:00+02:00');

// --- Schreiben --------------------------------------------------------------
const wipe = db.transaction(() => {
  db.prepare('DELETE FROM interests').run();
  db.prepare('DELETE FROM assignments').run();
  db.prepare('DELETE FROM slot_matched').run();
  db.prepare('DELETE FROM topics').run();
  db.prepare('DELETE FROM participants').run();
});

let interestCount = 0;
const seed = db.transaction(() => {
  const insP = db.prepare(
    `INSERT INTO participants (participant_id, name, claimed_at, password_hash)
     VALUES (?, ?, ?, ?)`,
  );
  participants.forEach((p, i) =>
    insP.run(p.id, p.name, base + i * 60_000, hashPassword(DEMO_PASSWORD)),
  );

  const insT = db.prepare(
    `INSERT INTO topics
       (id, title, description, owner_name, owner_id, preferred_slots, created_at, removed)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
  );
  const insI = db.prepare(
    `INSERT INTO interests (topic_id, participant_id, participant_name, joined_at)
     VALUES (?, ?, ?, ?)`,
  );

  topicDefs.forEach((t, ti) => {
    const topicId = randomUUID();
    const ownerId = idByName.get(t.owner);
    const createdAt = base + (ti + 1) * 3_600_000;
    insT.run(
      topicId,
      t.title,
      t.description,
      t.owner,
      ownerId,
      JSON.stringify(t.preferred),
      createdAt,
    );
    // Owner ist immer der erste Interessent.
    insI.run(topicId, ownerId, t.owner, createdAt);
    interestCount++;
    // Weitere Interessenten deterministisch, aber je Thema rotiert wählen.
    const others = participantNames.filter(n => n !== t.owner);
    for (let k = 0; k < t.count - 1; k++) {
      const name = others[(k + ti) % others.length];
      insI.run(topicId, idByName.get(name), name, createdAt + (k + 1) * 120_000);
      interestCount++;
    }
  });
});

wipe();
seed();
db.close();

console.log(
  `Demo-Daten geschrieben: ${participants.length} Teilnehmer, ` +
    `${topicDefs.length} Themen, ${interestCount} Interessen-Einträge.`,
);
console.log(`Login für alle Demo-Teilnehmer: Passwort "${DEMO_PASSWORD}".`);

// --- Matching anstoßen (best effort) ---------------------------------------
const token = adminToken();
const slotsToMatch = ['vormittag-1', 'vormittag-2'];
for (const slotId of slotsToMatch) {
  try {
    const res = await fetch(`${baseUrl}/api/admin/slots/${slotId}/match`, {
      method: 'POST',
      headers: { 'x-admin-token': token },
    });
    const body = await res.json().catch(() => ({}));
    console.log(
      res.ok
        ? `Matching ${slotId}: ok`
        : `Matching ${slotId}: Fehler — ${body.error ?? res.status}`,
    );
  } catch (e) {
    console.log(
      `Matching ${slotId}: Server unter ${baseUrl} nicht erreichbar ` +
        `(${e.message}). Bitte im Admin manuell starten.`,
    );
  }
}
