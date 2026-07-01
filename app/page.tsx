'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getParticipantId,
  getStoredName,
  setStoredName,
  setParticipantId,
  logout,
  apiGet,
  apiPost,
  apiDelete,
  ApiError,
} from '@/lib/client';
import type {
  Topic,
  SlotStatus,
  AppConfig,
  MapConfig,
  MeetingPoint,
  IncomingMessage,
} from '@/lib/types';
import { programmJfs2026, currentPhase } from '@/lib/programm';

type Tab = 'topics' | 'map' | 'mine';

interface ConfigResp {
  event: AppConfig['event'];
  map: MapConfig;
  meeting_points: AppConfig['meeting_points'];
  slots: AppConfig['slots'];
  min_interested: number;
}

interface ScheduleResp {
  slots: SlotStatus[];
  now: number;
}

export default function Home() {
  const [name, setName] = useState<string>('');
  const [nameConfirmed, setNameConfirmed] = useState<boolean>(false);
  const [tab, setTab] = useState<Tab>('topics');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [schedule, setSchedule] = useState<SlotStatus[]>([]);
  const [config, setConfig] = useState<ConfigResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Eingehende Admin-Nachrichten (ungelesen). Werden im 15-s-Polling
  // mitgeholt; die erste offene wird in einem Modal angezeigt.
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  // ID einer Nachricht, die der User in dieser Session „weggeklickt" hat.
  // Beim nächsten Refresh kommt sie automatisch wieder hoch — aber sie
  // schließt sich erst, wenn der User aktiv reagiert oder das X klickt.
  const [dismissedThisSession, setDismissedThisSession] = useState<Set<number>>(
    () => new Set(),
  );
  // Mini-Navigation aus einer Topic-Card auf die Karte: setzt Tab=map UND
  // erzwingt in MapView den passenden Slot. nonce: gleicher Topic darf
  // mehrfach springen, auch wenn der User zwischendurch andere Slots geklickt
  // hat.
  const [mapNav, setMapNav] = useState<{
    slotId: string;
    nonce: number;
  } | null>(null);

  function showOnMap(slotId: string) {
    setMapNav(prev => ({ slotId, nonce: (prev?.nonce ?? 0) + 1 }));
    setTab('map');
  }

  useEffect(() => {
    getParticipantId();
    const stored = getStoredName();
    if (!stored) return; // noch nie angemeldet → AuthGate
    // Gespeicherte Identität gegen den Server prüfen (automatisches Einloggen).
    // Netzwerk-/Server-Fehler dürfen die Identität NICHT verwerfen — wir
    // versuchen es erneut. Nur ein klares 401 (ID unbekannt) führt zum Login.
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const attempt = async (): Promise<void> => {
      if (cancelled) return;
      try {
        const r = await apiGet<{ name: string }>('/api/me');
        if (cancelled) return;
        setStoredName(r.name);
        setName(r.name);
        setNameConfirmed(true);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          logout();
          return;
        }
        // Netzwerkfehler / 5xx → Identität behalten, nach 3 s erneut versuchen.
        retryTimer = setTimeout(attempt, 3000);
      }
    };
    attempt();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  async function refresh() {
    try {
      const [c, t, s, m] = await Promise.all([
        apiGet<ConfigResp>('/api/config'),
        apiGet<{ topics: Topic[] }>('/api/topics'),
        apiGet<ScheduleResp>('/api/schedule'),
        apiGet<{ messages: IncomingMessage[] }>('/api/messages').catch(() => ({
          messages: [] as IncomingMessage[],
        })),
      ]);
      setConfig(c);
      setTopics(t.topics);
      setSchedule(s.slots);
      setMessages(m.messages);
    } catch (e) {
      setToast('Netzwerkfehler beim Laden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!nameConfirmed) return;
    refresh();
    const iv = setInterval(refresh, 15_000);
    return () => clearInterval(iv);
  }, [nameConfirmed]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  }

  if (!nameConfirmed) {
    return (
      <AuthGate
        onConfirm={n => {
          setName(n);
          setNameConfirmed(true);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <Header
        name={name}
        eventName={config?.event.name}
        onLogout={() => {
          logout();
          setName('');
          setNameConfirmed(false);
          setTab('topics');
        }}
      />
      <Tabs tab={tab} setTab={setTab} />

      {toast && (
        <div className="fixed inset-x-0 top-3 z-50 mx-auto max-w-md rounded-lg bg-slate-900 px-4 py-2 text-center text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {loading && <div className="mt-6 text-center text-slate-500">Lade…</div>}

      {!loading && tab === 'topics' && (
        <TopicsView
          topics={topics}
          config={config}
          onCreate={() => setShowCreate(true)}
          onChanged={refresh}
          flash={flash}
          showOnMap={showOnMap}
        />
      )}
      {!loading && tab === 'map' && (
        <MapView schedule={schedule} config={config} nav={mapNav} />
      )}
      {!loading && tab === 'mine' && (
        <MineView
          topics={topics}
          schedule={schedule}
          config={config}
          onChanged={refresh}
          flash={flash}
          showOnMap={showOnMap}
        />
      )}

      {showCreate && config && (
        <CreateModal
          config={config}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
            flash('Thema angelegt.');
          }}
        />
      )}

      {/* Admin → Teilnehmer Nachricht. Die erste ungelesene Nachricht, die
          der User in dieser Session noch nicht weggeklickt hat, wird als
          Modal angezeigt. */}
      {(() => {
        const active = messages.find(m => !dismissedThisSession.has(m.id));
        if (!active) return null;
        return (
          <MessageModal
            message={active}
            onSession={() =>
              setDismissedThisSession(s => new Set(s).add(active.id))
            }
            onResolved={() => {
              setDismissedThisSession(s => new Set(s).add(active.id));
              refresh();
            }}
            flash={flash}
          />
        );
      })()}
    </div>
  );
}

// Begriffe aus IT / KI / Java für die Passwort-Vorschläge.
const PW_WORDS = [
  'Lambda', 'Stream', 'Kotlin', 'Garbage', 'Heap', 'Thread', 'Loom',
  'Quarkus', 'Spring', 'Bean', 'Record', 'Sealed', 'Pattern', 'Tensor',
  'Prompt', 'Token', 'Vector', 'Neuron', 'Compiler', 'Bytecode', 'Cache',
  'Async', 'Future', 'Monad', 'Closure', 'Generic', 'Optional', 'Coroutine',
  'Reactive', 'Container', 'Cluster', 'Pipeline', 'Embedding', 'Inference',
  'Gradient', 'Quantum', 'Agent', 'Schema', 'Buffer', 'Pixel',
];

/** Schlägt ein Passwort aus 2–3 IT/KI/Java-Begriffen vor, z.B. „Lambda-Tensor". */
function suggestPassword(): string {
  const pool = [...PW_WORDS];
  const n = Math.random() < 0.5 ? 2 : 3;
  const picks: string[] = [];
  for (let i = 0; i < n; i++) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picks.join('-');
}

function AuthGate({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  // Bewusst leer initialisiert — ein vorgemerktes Passwort wird leicht
  // übersehen und dann vergessen. Der User muss aktiv 🎲 klicken oder
  // selbst tippen.
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchTo(next: 'register' | 'login') {
    setMode(next);
    setErr(null);
    setPassword('');
  }

  async function submit() {
    setErr(null);
    const n = name.trim();
    const pw = password.trim();
    if (mode === 'register') {
      if (n.length < 3) return setErr('Anzeigename: mindestens 3 Zeichen.');
      if (!/[a-zA-ZäöüÄÖÜß]/.test(n)) return setErr('Bitte Buchstaben verwenden.');
      if (/^(.)\1{2,}$/.test(n)) return setErr('Bitte kein „aaa"-Muster.');
      if (['abc', 'xyz', 'test', 'asdf', '123'].includes(n.toLowerCase())) {
        return setErr('Bitte einen etwas eindeutigeren Namen.');
      }
    } else if (!n) {
      return setErr('Bitte deinen Anzeigenamen eingeben.');
    }
    if (pw.length < 4) return setErr('Passwort: mindestens 4 Zeichen.');

    setBusy(true);
    try {
      const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const r = await apiPost<{ participant_id: string; name: string }>(path, {
        name: n,
        password: pw,
      });
      setParticipantId(r.participant_id);
      setStoredName(r.name);
      onConfirm(r.name);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-12">
      <h1 className="mb-4 text-center text-xl font-semibold text-jfs-primary">
        JFS 2026 · Community Exchange
      </h1>

      {/* Segmented Control: Modus oben groß sichtbar. Nach dem Abmelden
          landet man wieder auf der Registrierung; ohne diesen Hinweis ist
          nicht sofort klar, dass es zwei Modi gibt. */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(['register', 'login'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => switchTo(m)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === m
                ? 'bg-jfs-primary text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {m === 'register' ? 'Account anlegen' : 'Anmelden'}
          </button>
        ))}
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-800">
          {mode === 'register' ? 'Neuen Account anlegen' : 'Bei bestehendem Account anmelden'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {mode === 'register'
            ? 'Anzeigename und Passwort. Keine E-Mail, kein Klarname nötig.'
            : 'Mit Anzeigename und Passwort — z.B. auf einem weiteren Gerät.'}
        </p>

        <label className="label mt-4">Anzeigename</label>
        <input
          className="input"
          autoFocus
          value={name}
          placeholder="dein Name oder Pseudonym"
          onChange={e => {
            setName(e.target.value);
            setErr(null);
          }}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />

        <label className="label mt-3">Passwort</label>
        <div className="flex gap-2">
          <input
            className="input"
            type={mode === 'register' ? 'text' : 'password'}
            value={password}
            placeholder={
              mode === 'register'
                ? 'eigenes Passwort wählen oder Vorschlag würfeln →'
                : 'dein Passwort'
            }
            onChange={e => {
              setPassword(e.target.value);
              setErr(null);
            }}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          {mode === 'register' && (
            <button
              type="button"
              className="btn-secondary shrink-0"
              title="Passwort-Vorschlag würfeln"
              onClick={() => {
                setPassword(suggestPassword());
                setErr(null);
              }}
            >
              🎲
            </button>
          )}
        </div>
        {mode === 'register' && (
          <p className="mt-1 text-xs text-slate-500">
            Mind. 4 Zeichen, eine 4-stellige PIN reicht. Merk es dir — du
            brauchst es, um dich auf weiteren Geräten anzumelden.
          </p>
        )}

        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

        <button className="btn-primary mt-4 w-full" disabled={busy} onClick={submit}>
          {busy ? 'Moment…' : mode === 'register' ? 'Account anlegen' : 'Anmelden'}
        </button>
      </div>
    </div>
  );
}

function Header({
  name,
  eventName,
  onLogout,
}: {
  name: string;
  eventName?: string;
  onLogout: () => void;
}) {
  const [programmOpen, setProgrammOpen] = useState(false);
  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {eventName ?? 'JFS 2026 · Community Exchange'}
          </div>
          <div className="text-sm">
            Hallo <span className="font-semibold">{name}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-base hover:border-jfs-primary"
            onClick={() => setProgrammOpen(true)}
            title="Vortragsprogramm anzeigen"
            aria-label="Vortragsprogramm anzeigen"
          >
            📋
          </button>
          <button className="btn-secondary text-xs" onClick={onLogout}>
            Abmelden
          </button>
        </div>
      </header>
      {programmOpen && <ProgrammModal onClose={() => setProgrammOpen(false)} />}
    </>
  );
}

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string }[] = [
    { id: 'topics', label: 'Themen' },
    { id: 'map', label: 'Karte' },
    { id: 'mine', label: 'Meine Themen' },
  ];
  return (
    <nav className="sticky top-0 z-10 -mx-4 mb-4 bg-jfs-bg/90 px-4 pb-2 pt-1 backdrop-blur">
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {items.map(it => (
          <button
            key={it.id}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === it.id
                ? 'bg-jfs-primary text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setTab(it.id)}
          >
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function TopicsView({
  topics,
  config,
  onCreate,
  onChanged,
  flash,
  showOnMap,
}: {
  topics: Topic[];
  config: ConfigResp | null;
  onCreate: () => void;
  onChanged: () => void;
  flash: (m: string) => void;
  showOnMap: (slotId: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return topics;
    return topics.filter(
      t =>
        t.title.toLowerCase().includes(s) ||
        (t.description ?? '').toLowerCase().includes(s),
    );
  }, [topics, q]);

  // Aufteilung: ein Thema gilt als "zugeteilt", wenn es eine Zuordnung MIT
  // Treffpunkt hat. assignment ohne meeting_point_id ("diesmal nicht")
  // bleibt im offenen Bereich — von dort aus qualifiziert es sich für den
  // nächsten Slot, was ja "noch offen" entspricht.
  const { assigned, open } = useMemo(() => {
    const slotStart = (sid: string): number => {
      const s = config?.slots.find(x => x.id === sid);
      return s ? new Date(s.start).getTime() : Number.POSITIVE_INFINITY;
    };
    const a: Topic[] = [];
    const o: Topic[] = [];
    for (const t of filtered) {
      if (t.assignment?.meeting_point_id) a.push(t);
      else o.push(t);
    }
    // Zugeteilt: chronologisch (nächster Slot zuerst).
    a.sort((x, y) => slotStart(x.assignment!.slot_id) - slotStart(y.assignment!.slot_id));
    // Noch offen: frisch oben — neu angelegte Themen bleiben sichtbar.
    o.sort((x, y) => y.created_at - x.created_at);
    return { assigned: a, open: o };
  }, [filtered, config]);

  async function join(t: Topic) {
    try {
      await apiPost(`/api/topics/${t.id}/join`, {});
      onChanged();
    } catch (e) {
      flash((e as Error).message);
    }
  }
  async function leave(t: Topic) {
    try {
      await apiPost(`/api/topics/${t.id}/leave`, {});
      onChanged();
    } catch (e) {
      flash((e as Error).message);
    }
  }

  const cutoffMin = config?.slots[0]?.cutoff_minutes ?? 60;

  return (
    <section>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <input
            className="input pr-9"
            placeholder="Suchen (bevor du ein neues Thema anlegst)…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              aria-label="Suche löschen"
              onClick={() => setQ('')}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={onCreate}>
          + Thema
        </button>
      </div>

      {/* Dezenter Erklärsatz zum Themen-Lebenszyklus — beantwortet die
          Frage „ab wann findet ein Thema statt?". Nur einmal sichtbar; bei
          leerer Liste fällt er weg. */}
      {filtered.length > 0 && (
        <p className="mb-3 text-xs text-slate-500">
          Sobald genug Mitstreiter da sind, wird ein Thema ca. {cutoffMin} Min vor
          dem Slot einem Treffpunkt zugeteilt. Tippe auf eine Zuteilung, um sie
          auf der Karte zu sehen.
        </p>
      )}

      {filtered.length === 0 && (
        <div className="card text-center text-slate-500">
          {topics.length === 0
            ? 'Noch keine Themen. Sei der Erste!'
            : 'Keine Treffer. Möchtest du ein neues Thema anlegen?'}
        </div>
      )}

      {assigned.length > 0 && (
        <>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Zugeteilt ({assigned.length})
          </h2>
          <ul className="mb-5 space-y-3">
            {assigned.map(t => (
              <TopicCard
                key={t.id}
                topic={t}
                config={config}
                onJoin={() => join(t)}
                onLeave={() => leave(t)}
                showOnMap={showOnMap}
              />
            ))}
          </ul>
        </>
      )}

      {open.length > 0 && (
        <>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Noch offen ({open.length})
          </h2>
          <ul className="space-y-3">
            {open.map(t => (
              <TopicCard
                key={t.id}
                topic={t}
                config={config}
                onJoin={() => join(t)}
                onLeave={() => leave(t)}
                showOnMap={showOnMap}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TopicCard({
  topic,
  config,
  onJoin,
  onLeave,
  showOnMap,
}: {
  topic: Topic;
  config: ConfigResp | null;
  onJoin: () => void;
  onLeave: () => void;
  showOnMap: (slotId: string) => void;
}) {
  const min = config?.min_interested ?? 3;
  const mp =
    topic.assignment?.meeting_point_id &&
    config?.meeting_points.find(m => m.id === topic.assignment?.meeting_point_id);
  const slot =
    topic.assignment?.slot_id && config?.slots.find(s => s.id === topic.assignment?.slot_id);
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{topic.title}</h3>
          {topic.description && (
            <p className="mt-1 text-sm text-slate-600 line-clamp-3">{topic.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip">👤 {topic.owner_name}</span>
            <span
              className={topic.interest_count >= min ? 'chip-primary' : 'chip-muted'}
            >
              {topic.interest_count} {topic.interest_count === 1 ? 'Interessent' : 'Interessenten'}
              {topic.interest_count < min ? ` (ab ${min})` : ''}
            </span>
            {topic.preferred_slots.map(sid => {
              const s = config?.slots.find(x => x.id === sid);
              return (
                <span key={sid} className="chip-warn">
                  Wunsch: {s?.name ?? sid}
                </span>
              );
            })}
          </div>

          {mp && slot && (
            <button
              type="button"
              onClick={() => showOnMap(slot.id)}
              title="Auf Karte anzeigen"
              className="mt-3 block w-full rounded-lg bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-900 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              ✅ Zugeordnet: <strong>{mp.name}</strong> · {slot.name}{' '}
              <span aria-hidden="true">→</span>
            </button>
          )}
          {topic.assignment && !mp && (
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Diesmal leider nicht zugeteilt — qualifiziert sich für den nächsten Slot.
            </div>
          )}
        </div>
        <div className="shrink-0">
          {topic.is_owner ? (
            <span className="chip-primary">Dein Thema</span>
          ) : topic.is_interested ? (
            <button className="btn-secondary" onClick={onLeave}>
              Doch nicht
            </button>
          ) : (
            <button className="btn-primary" onClick={onJoin}>
              Mitmachen
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function CreateModal({
  config,
  onClose,
  onCreated,
}: {
  config: ConfigResp;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preferred, setPreferred] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const now = Date.now();
  const openSlots = config.slots.filter(s => {
    const cutoff = new Date(s.start).getTime() - s.cutoff_minutes * 60_000;
    return cutoff > now;
  });

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await apiPost('/api/topics', {
        title: title.trim(),
        description: description.trim() || undefined,
        preferred_slots: preferred,
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Neues Thema</h2>
          <button className="btn-secondary text-xs" onClick={onClose}>
            Abbrechen
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tipp: Schau zuerst, ob dein Thema schon in der Liste steht.
        </p>
        <label className="label mt-4">Titel</label>
        <input
          className="input"
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="z.B. Compose Multiplatform in der Praxis"
        />
        <label className="label mt-3">Kurzbeschreibung (optional)</label>
        <textarea
          className="input min-h-20"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Worum soll es gehen? 1–2 Sätze reichen."
        />
        <label className="label mt-3">Wunsch-Slots (optional)</label>
        <div className="flex flex-wrap gap-2">
          {openSlots.map(s => {
            const active = preferred.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm ${
                  active
                    ? 'border-jfs-primary bg-jfs-primary text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
                onClick={() =>
                  setPreferred(p =>
                    p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id],
                  )
                }
              >
                {s.name}
              </button>
            );
          })}
          {openSlots.length === 0 && (
            <span className="text-xs text-slate-500">
              Keine offenen Slots mehr.
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Du wirst automatisch Themen-Owner („Hutträger") und erster Interessent.
        </p>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <button className="btn-primary mt-4 w-full" disabled={busy} onClick={submit}>
          {busy ? 'Lege an…' : 'Thema anlegen'}
        </button>
      </div>
    </div>
  );
}

/**
 * Modal für eine Admin → Teilnehmer Nachricht. Der User kann antworten oder
 * „Komme am Info-Stand vorbei" wählen — beides schließt das Modal und
 * markiert die Nachricht serverseitig als beantwortet/erledigt. Wer einfach
 * das X klickt, sieht das Modal beim nächsten Refresh wieder (sanfter Druck).
 */
function MessageModal({
  message,
  onSession,
  onResolved,
  flash,
}: {
  message: IncomingMessage;
  onSession: () => void;
  onResolved: () => void;
  flash: (m: string) => void;
}) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<'reply' | 'dismiss' | null>(null);

  async function sendReply() {
    const trimmed = reply.trim();
    if (trimmed.length < 1) return flash('Bitte eine kurze Antwort schreiben.');
    setBusy('reply');
    try {
      await apiPost(`/api/messages/${message.id}/reply`, { body: trimmed });
      flash('Antwort gesendet.');
      onResolved();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy('dismiss');
    try {
      await apiPost(`/api/messages/${message.id}/dismiss`, {});
      flash('Erledigt — wir treffen uns am Info-Stand.');
      onResolved();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center">
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <button
          type="button"
          aria-label="Vorerst schließen"
          onClick={onSession}
          title="Vorerst schließen (Nachricht kommt beim nächsten Refresh wieder)"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>

        <div className="text-xs font-semibold uppercase tracking-wide text-jfs-primary">
          Nachricht vom Info-Stand
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
          {message.body}
        </p>

        <label className="label mt-4">Deine kurze Antwort</label>
        <textarea
          className="input min-h-20"
          value={reply}
          maxLength={500}
          onChange={e => setReply(e.target.value)}
          placeholder={"z.B. „Ja, ich meine das Thema ernst — komme nachher kurz vorbei.“"}
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="btn-secondary"
            disabled={busy !== null}
            onClick={dismiss}
          >
            {busy === 'dismiss' ? 'Moment…' : 'Komme am Info-Stand vorbei'}
          </button>
          <button
            className="btn-primary"
            disabled={busy !== null}
            onClick={sendReply}
          >
            {busy === 'reply' ? 'Sende…' : 'Antwort senden'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Marker für Community-Exchange-Tische: alle einheitlich gelb mit schwarzer
// Nummer — Anlehnung an die gelben Punkte in der Community-Area der
// Lageplan-Grafik. Der Bezug Karte ↔ Liste läuft über die Nummer, nicht über
// individuelle Farben.
const MARKER_FILL = '#facc15';    // yellow-400 — kräftig, gut sichtbar auf der Karte
const MARKER_BORDER = '#a16207';  // yellow-700 — dunkler Rand für Kontrast
const MARKER_TEXT = '#111827';    // gray-900 — fast schwarz, gut lesbar auf Gelb

function MapView({
  schedule,
  config,
  nav,
}: {
  schedule: SlotStatus[];
  config: ConfigResp | null;
  nav: { slotId: string; nonce: number } | null;
}) {
  const [slotId, setSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (!config || !schedule.length) return;
    // Default: nächster noch offener oder laufender Slot, sonst letzter
    const now = Date.now();
    const next =
      schedule.find(s => new Date(s.slot.end).getTime() > now) ?? schedule[schedule.length - 1];
    setSlotId(prev => prev ?? next.slot.id);
  }, [config, schedule]);

  // Mini-Navigation aus einer Topic-Card: überschreibt aktuellen Slot.
  // Nonce als Dep, damit derselbe Klick auch nach manuellem Wechsel wieder
  // greift. Anschließendes manuelles Slot-Tippen bleibt unberührt.
  useEffect(() => {
    if (!nav) return;
    setSlotId(nav.slotId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav?.nonce]);

  if (!config) return null;
  const current = schedule.find(s => s.slot.id === slotId) ?? schedule[0];
  if (!current) {
    return <div className="card text-slate-500">Keine Slots konfiguriert.</div>;
  }

  const assignByMp = new Map<string, typeof current.assignments[number]>();
  for (const a of current.assignments) {
    if (a.meeting_point_id) assignByMp.set(a.meeting_point_id, a);
  }

  const visibleMps = config.meeting_points.filter(mp =>
    mp.slots.includes(current.slot.id),
  );

  // Nummer je Treffpunkt — stabil aus der Config-Reihenfolge, unabhängig
  // vom Slot. Karte und Liste zeigen dieselbe Nummer im gleichen gelben
  // Marker-Stil, damit der visuelle Bezug eindeutig ist.
  const numberByMp = new Map<string, number>();
  config.meeting_points.forEach((mp, i) => {
    numberByMp.set(mp.id, i + 1);
  });

  return (
    <section>
      {/* Mobil: horizontal scrollbare Leiste. Ab sm: umbrechen (Desktop hat
          Breite und keinen Touch — Scrollen wäre dort nicht bedienbar). */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {schedule.map(s => (
          <button
            key={s.slot.id}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
              s.slot.id === slotId
                ? 'border-jfs-primary bg-jfs-primary text-white'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
            onClick={() => setSlotId(s.slot.id)}
          >
            {s.slot.name}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">{current.slot.name}</div>
          <StatusChip status={current} />
        </div>

        <MapPlan
          plan={config.map.plan}
          markerBox={config.map.marker_box}
          connector={config.map.connector}
          meetingPoints={visibleMps}
          assignByMp={assignByMp}
          numberByMp={numberByMp}
        />

        <ul className="mt-4 divide-y divide-slate-100">
          {visibleMps.map(mp => {
            const a = assignByMp.get(mp.id);
            const num = numberByMp.get(mp.id) ?? 0;
            return (
              <li key={mp.id} className="py-2.5">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                    style={
                      a
                        ? { backgroundColor: MARKER_FILL, borderColor: MARKER_BORDER, color: MARKER_TEXT }
                        : { backgroundColor: '#fff', borderColor: MARKER_BORDER, color: MARKER_BORDER }
                    }
                  >
                    {num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{mp.name}</div>
                    {a ? (
                      <div className="text-sm text-slate-700">{a.topic_title}</div>
                    ) : (
                      <div className="mt-0.5">
                        <span className={current.matched ? 'chip-muted' : 'chip'}>
                          {current.matched ? 'frei' : 'noch offen'}
                        </span>
                      </div>
                    )}
                    <div className="mt-0.5 text-xs text-slate-500">
                      Kapazität {mp.capacity}
                      {a ? ` · ${a.interest_count} Interessenten` : ''}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {visibleMps.length === 0 && (
            <li className="py-3 text-sm text-slate-500">
              Für {current.slot.name} ist kein Treffpunkt aktiv.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function MapPlan({
  plan,
  markerBox,
  connector,
  meetingPoints,
  assignByMp,
  numberByMp,
}: {
  plan: string;
  markerBox: { x: number; y: number; w: number; h: number };
  connector?: { from: { x: number; y: number }; to: { x: number; y: number } };
  meetingPoints: MeetingPoint[];
  assignByMp: Map<string, { topic_title: string }>;
  numberByMp: Map<string, number>;
}) {
  return (
    <PinchZoomContainer className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={plan}
        alt="Lageplan Community Exchange"
        className="block w-full select-none"
        draggable={false}
      />
      {/* Leitpfeil von der Box zur tatsächlichen Community-Area
          (orangefarbene Designer-Kreise). Liegt unter der Box, damit die
          Linie an der Box visuell zu enden scheint. Weiße Aura für
          Lesbarkeit über dem Plan-Hintergrund. */}
      {connector && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="bof-connector-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={MARKER_BORDER} />
            </marker>
          </defs>
          <line
            x1={`${connector.from.x * 100}%`}
            y1={`${connector.from.y * 100}%`}
            x2={`${connector.to.x * 100}%`}
            y2={`${connector.to.y * 100}%`}
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={`${connector.from.x * 100}%`}
            y1={`${connector.from.y * 100}%`}
            x2={`${connector.to.x * 100}%`}
            y2={`${connector.to.y * 100}%`}
            stroke={MARKER_BORDER}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 4"
            markerEnd="url(#bof-connector-arrow)"
          />
        </svg>
      )}
      {/* "Schild" mit den Treffpunkten — weißer Hintergrund über der Karte,
          damit die kleinen orangefarbenen Designer-Kreise nicht überdeckt
          werden und die nummerierten Marker übersichtlich beieinander liegen. */}
      <div
        className="pointer-events-none absolute rounded-lg border border-slate-300 bg-white/95 shadow-sm"
        style={{
          left: `${markerBox.x * 100}%`,
          top: `${markerBox.y * 100}%`,
          width: `${markerBox.w * 100}%`,
          height: `${markerBox.h * 100}%`,
        }}
      >
        <div className="px-2 pt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
          Treffpunkte
        </div>
      </div>
      {/* Treffpunkte als kleine gelbe Nummern-Marker — gefüllt = belegt,
          umrandet = frei. Einheitliches Gelb spiegelt die Designer-Kreise
          in der Community-Area der Karte wider; die Nummer auf dem Marker
          entspricht der Nummer in der Liste darunter. */}
      {meetingPoints.map(mp => {
        const a = assignByMp.get(mp.id);
        const num = numberByMp.get(mp.id) ?? 0;
        return (
          <div
            key={mp.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${mp.x * 100}%`, top: `${mp.y * 100}%` }}
            title={a ? `${mp.name}: ${a.topic_title}` : `${mp.name} (frei)`}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow ring-2 ring-white"
              style={
                a
                  ? { backgroundColor: MARKER_FILL, borderColor: MARKER_BORDER, color: MARKER_TEXT }
                  : { backgroundColor: '#fff', borderColor: MARKER_BORDER, color: MARKER_BORDER }
              }
            >
              {num}
            </div>
          </div>
        );
      })}
    </PinchZoomContainer>
  );
}

/**
 * Schlanker Pinch-/Pan-/Wheel-Zoom-Container ohne externe Library.
 * - 1 Finger / Maus-Drag: verschieben
 * - 2 Finger: zoomen
 * - Mausrad: zoomen
 * - Doppel-Klick / Doppel-Tap: Reset
 * Skala ist auf [1, 5] geclamped — kein Aus-/Reinraus-Zoom unter die Originalgröße.
 */
function PinchZoomContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const minScale = 1;
  const maxScale = 5;

  function clamp(s: number): number {
    return Math.max(minScale, Math.min(maxScale, s));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pts = pointersRef.current;
    if (!pts.has(e.pointerId)) return;

    if (pts.size === 1) {
      const old = pts.get(e.pointerId)!;
      const dx = e.clientX - old.x;
      const dy = e.clientY - old.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pts.size === 2) {
      // Distanz vorher
      const [a0, a1] = Array.from(pts.values()) as Array<{ x: number; y: number }>;
      const oldDist = Math.hypot(a0.x - a1.x, a0.y - a1.y);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [b0, b1] = Array.from(pts.values()) as Array<{ x: number; y: number }>;
      const newDist = Math.hypot(b0.x - b1.x, b0.y - b1.y);
      if (oldDist > 0) {
        const ratio = newDist / oldDist;
        setTransform(t => {
          const newScale = clamp(t.scale * ratio);
          // Falls Clamp griffe, behalten wir die alte Skala
          const effective = newScale / t.scale;
          return { scale: newScale, x: t.x * effective, y: t.y * effective };
        });
      }
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 5) return;
    e.preventDefault();
    const ratio = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform(t => {
      const newScale = clamp(t.scale * ratio);
      const effective = newScale / t.scale;
      return { scale: newScale, x: t.x * effective, y: t.y * effective };
    });
  }

  function onDoubleClick() {
    setTransform({ scale: 1, x: 0, y: 0 });
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
    >
      <div
        style={{
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
      {transform.scale > 1.05 && (
        <button
          type="button"
          onClick={() => setTransform({ scale: 1, x: 0, y: 0 })}
          className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
        >
          Zoom zurücksetzen
        </button>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: SlotStatus }) {
  if (status.matched) return <span className="chip-success">Zugeteilt</span>;
  if (status.cutoffPassed) return <span className="chip-warn">Matching läuft…</span>;
  return <span className="chip">Noch offen</span>;
}

function MineView({
  topics,
  schedule,
  config,
  onChanged,
  flash,
  showOnMap,
}: {
  topics: Topic[];
  schedule: SlotStatus[];
  config: ConfigResp | null;
  onChanged: () => void;
  flash: (m: string) => void;
  showOnMap: (slotId: string) => void;
}) {
  const mine = topics.filter(t => t.is_owner || t.is_interested);

  if (!config) return null;
  if (mine.length === 0) {
    return (
      <>
        <p className="mb-3 text-xs text-slate-500">
          Hier siehst du dein eigenes Thema und alle Themen, bei denen du mitmachst.
        </p>
        <div className="card text-center text-slate-500">
          Du hast noch kein Thema angelegt und bist keinem beigetreten.
        </div>
      </>
    );
  }

  async function del(t: Topic) {
    if (!confirm('Dein Thema wirklich löschen?')) return;
    try {
      await apiDelete(`/api/topics/${t.id}`);
      onChanged();
      flash('Thema gelöscht.');
    } catch (e) {
      flash((e as Error).message);
    }
  }
  async function leave(t: Topic) {
    try {
      await apiPost(`/api/topics/${t.id}/leave`, {});
      onChanged();
    } catch (e) {
      flash((e as Error).message);
    }
  }

  return (
    <section className="space-y-3">
      <p className="text-xs text-slate-500">
        Hier siehst du dein eigenes Thema und alle Themen, bei denen du mitmachst.
      </p>
      {mine.map(t => {
        const slot = t.assignment?.slot_id
          ? schedule.find(s => s.slot.id === t.assignment?.slot_id)
          : null;
        const mp = t.assignment?.meeting_point_id
          ? config.meeting_points.find(m => m.id === t.assignment?.meeting_point_id)
          : null;
        return (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{t.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {t.is_owner ? <span className="chip-primary">Hutträger</span> : null}
                  <span className="chip">{t.interest_count} Interessenten</span>
                </div>
              </div>
              <div className="shrink-0">
                {t.is_owner ? (
                  <button className="btn-secondary" onClick={() => del(t)}>
                    Löschen
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => leave(t)}>
                    Doch nicht
                  </button>
                )}
              </div>
            </div>

            {mp && slot ? (
              <button
                type="button"
                onClick={() => showOnMap(slot.slot.id)}
                title="Auf Karte anzeigen"
                className="mt-3 block w-full rounded-lg bg-emerald-50 px-3 py-2 text-left text-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <div className="font-semibold text-emerald-900">
                  ✅ {mp.name} <span aria-hidden="true">→</span>
                </div>
                <div className="text-emerald-800">{slot.slot.name}</div>
              </button>
            ) : t.assignment ? (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Diesmal leider nicht — du qualifizierst dich automatisch für den nächsten Slot.
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                ⏳ Wartet auf Zuordnung. Cutoff ist jeweils {config.slots[0]?.cutoff_minutes ?? 60} Min vor Slot-Beginn.
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Modal mit dem vollständigen Vortragsprogramm. Hebt den aktuell
 * laufenden Vortrags-Slot hervor (Zeit-Matching ohne Datum, damit es
 * auch beim Testen außerhalb des Event-Tages funktioniert). Aktualisiert
 * sich jede Minute, scrollt beim Öffnen automatisch zum aktuellen Slot.
 */
function ProgrammModal({ onClose }: { onClose: () => void }) {
  const [hhmm, setHhmm] = useState(currentHhmm());
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setHhmm(currentHhmm()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Beim Öffnen einmal zum aktuellen Slot scrollen
    currentRef.current?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phase = currentPhase(hhmm);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:rounded-xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Vortragsprogramm JFS 2026
            </div>
            <div className="text-sm font-medium">
              <span className="text-slate-700">Jetzt {hhmm}</span>
              <span className="text-slate-400"> · </span>
              <span
                className={
                  phase.kind === 'talk'
                    ? 'text-emerald-700'
                    : phase.kind === 'lunch'
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }
              >
                {phase.label}
              </span>
            </div>
          </div>
          <button
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Schließen"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-4 py-3">
          {programmJfs2026.map(slot => {
            const isCurrent = phase.slot?.start === slot.start;
            return (
              <section
                key={slot.start}
                ref={isCurrent ? currentRef : undefined}
                className={`mb-4 rounded-lg border ${
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b px-3 py-2 text-sm font-semibold ${
                    isCurrent
                      ? 'border-emerald-200 text-emerald-900'
                      : 'border-slate-100 text-slate-700'
                  }`}
                >
                  <span>
                    {slot.start} – {slot.end}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Jetzt
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-slate-100">
                  {slot.talks.map(t => (
                    <li key={t.room} className="px-3 py-2 text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {t.room}
                        </span>
                        <span className="font-medium text-slate-900">{t.title}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {t.speakers.join(', ')}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <div className="pb-2 text-center text-[10px] text-slate-400">
            Stand: Scrape von java-forum-stuttgart.de · 2026-07-01
          </div>
        </div>
      </div>
    </div>
  );
}

function currentHhmm(): string {
  const d = new Date();
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
}
