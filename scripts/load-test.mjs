#!/usr/bin/env node
// Schlanker Load-Test: simuliert N gleichzeitige Teilnehmer, die alle 15 s die
// vier Polling-GETs absetzen (config, topics, schedule, messages). Misst
// Antwortzeiten je Endpoint und gibt am Ende Perzentile aus.
//
// Aufruf:
//   node scripts/load-test.mjs [users] [duration_s] [base_url]
//   node scripts/load-test.mjs 200 60        # 200 User für 60 s gegen localhost
//   node scripts/load-test.mjs 200 60 https://example.com
//
// Räumt am Ende per direktem DB-Zugriff alle Lasttest-Accounts wieder weg.

import Database from 'better-sqlite3';
import path from 'node:path';

const BASE = process.argv[4] ?? process.env.BOF_BASE_URL ?? 'http://localhost:3000';
const N_USERS = parseInt(process.argv[2] ?? '200', 10);
const DURATION_S = parseInt(process.argv[3] ?? '60', 10);
const POLL_INTERVAL_MS = 15_000;
const SPAWN_GAP_MS = 30; // 200 User in ~6 s registriert

const NAME_PREFIX = 'Lasttest';
const PASSWORD = 'load-test-pw-2026';

const stats = new Map(); // endpoint -> [{ms, ok}]
let errorSamples = []; // bis zu 10 erste Fehler

function record(endpoint, ms, ok, errMsg) {
  if (!stats.has(endpoint)) stats.set(endpoint, []);
  stats.get(endpoint).push({ ms, ok });
  if (!ok && errorSamples.length < 10) errorSamples.push(`${endpoint}: ${errMsg}`);
}

async function timed(label, fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    record(label, performance.now() - t0, true);
    return result;
  } catch (e) {
    record(label, performance.now() - t0, false, e.message);
    return null;
  }
}

async function registerUser(name) {
  return timed('register', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: PASSWORD }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

async function pollOnce(pid) {
  const headers = { 'x-participant-id': pid };
  await Promise.all([
    timed('config', async () => {
      const r = await fetch(`${BASE}/api/config`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    timed('topics', async () => {
      const r = await fetch(`${BASE}/api/topics`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    timed('schedule', async () => {
      const r = await fetch(`${BASE}/api/schedule`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    timed('messages', async () => {
      const r = await fetch(`${BASE}/api/messages`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  ]);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runUser(idx, endTime) {
  const reg = await registerUser(`${NAME_PREFIX} ${String(idx).padStart(4, '0')}`);
  if (!reg) return; // Fehler schon in stats
  const pid = reg.participant_id;

  // Erster Poll sofort
  await pollOnce(pid);

  // Jitter, damit nicht alle exakt gleichzeitig pollen
  await sleep(Math.random() * POLL_INTERVAL_MS);

  while (Date.now() < endTime) {
    await pollOnce(pid);
    await sleep(POLL_INTERVAL_MS);
  }
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[i];
}

function fmt(ms) { return ms.toFixed(1).padStart(7); }

function summarize(elapsed) {
  console.log('\n=== Ergebnisse ===');
  console.log(`Dauer:       ${(elapsed / 1000).toFixed(1)} s`);
  console.log(`User:        ${N_USERS}`);
  console.log(`Base-URL:    ${BASE}\n`);

  console.log('Endpoint    |   Calls |  OK% |   min  |   p50  |   p95  |   p99  |   max  | (ms)');
  console.log('-'.repeat(90));
  let totalCalls = 0;
  for (const [endpoint, results] of stats) {
    const all = results.map(r => r.ms);
    const ok = results.filter(r => r.ok).length;
    const okPct = (ok / results.length * 100).toFixed(1);
    totalCalls += results.length;
    console.log(
      `${endpoint.padEnd(11)} | ${String(results.length).padStart(7)} | ${okPct.padStart(4)} |`
      + ` ${fmt(Math.min(...all))} | ${fmt(percentile(all, 0.5))} |`
      + ` ${fmt(percentile(all, 0.95))} | ${fmt(percentile(all, 0.99))} |`
      + ` ${fmt(Math.max(...all))} |`,
    );
  }
  const throughput = (totalCalls / (elapsed / 1000)).toFixed(1);
  console.log(`\nGesamt-Throughput: ${totalCalls} Calls = ${throughput} req/s`);

  if (errorSamples.length > 0) {
    console.log('\nFehler-Beispiele:');
    for (const e of errorSamples) console.log('  ', e);
  }
}

function cleanup() {
  const dbPath = process.env.BOF_DB_PATH ?? path.join(process.cwd(), 'data', 'bof.sqlite');
  try {
    const db = new Database(dbPath);
    const res = db
      .prepare(`DELETE FROM participants WHERE name LIKE '${NAME_PREFIX} %'`)
      .run();
    db.close();
    console.log(`\nAufgeräumt: ${res.changes} Lasttest-Accounts entfernt (Cascade auch Interests etc.).`);
  } catch (e) {
    console.log(`\nCleanup übersprungen (kein DB-Zugriff): ${e.message}`);
  }
}

async function main() {
  console.log(`Load-Test: ${N_USERS} User für ${DURATION_S} s gegen ${BASE}`);
  console.log(`Polling alle ${POLL_INTERVAL_MS / 1000} s pro User, Spawn-Gap ${SPAWN_GAP_MS} ms\n`);

  const start = Date.now();
  const endTime = start + DURATION_S * 1000;

  // User mit Stagger spawnen, damit Register nicht alle in derselben ms anschlagen
  const promises = [];
  for (let i = 0; i < N_USERS; i++) {
    promises.push(runUser(i, endTime));
    if (i < N_USERS - 1) await sleep(SPAWN_GAP_MS);
  }

  console.log(`Alle ${N_USERS} User gespawnt nach ${((Date.now() - start) / 1000).toFixed(1)} s. Läuft...\n`);

  await Promise.all(promises);
  const elapsed = Date.now() - start;

  summarize(elapsed);
  cleanup();
}

main().catch(e => {
  console.error('Load-Test gescheitert:', e);
  cleanup();
  process.exit(1);
});
