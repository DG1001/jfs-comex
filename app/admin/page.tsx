'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  Topic,
  SlotStatus,
  MeetingPoint,
  MapConfig,
  MarkerBox,
  AdminParticipant,
  AdminMessage,
} from '@/lib/types';

interface Overview {
  topics: Topic[];
  participants: Record<string, Array<{ name: string; joined_at: number }>>;
  participants_all: AdminParticipant[];
  removed: Array<{ id: string; title: string; owner_name: string; created_at: number }>;
  slots: SlotStatus[];
  map: MapConfig;
  meeting_points: MeetingPoint[];
}

const TOKEN_KEY = 'bof.admin_token';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) {
      setToken(t);
      load(t);
    }
  }, []);

  async function load(tok: string) {
    setErr(null);
    try {
      const res = await fetch('/api/admin/overview', {
        cache: 'no-store',
        headers: { 'x-admin-token': tok },
      });
      if (res.status === 403) {
        setErr('Token ungültig.');
        setAuthed(false);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Overview;
      setData(json);
      setAuthed(true);
      sessionStorage.setItem(TOKEN_KEY, tok);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function removeTopic(id: string) {
    if (!confirm('Thema entfernen?')) return;
    const res = await fetch(`/api/admin/topics/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    });
    if (res.ok) load(token);
    else setErr(`Löschen fehlgeschlagen: ${res.status}`);
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16">
        <div className="card">
          <h1 className="text-xl font-semibold text-jfs-primary">Admin-Login</h1>
          <label className="label mt-4">Admin-Token</label>
          <input
            className="input"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <button className="btn-primary mt-4 w-full" onClick={() => load(token)}>
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-jfs-primary">
          Admin · Community Exchange JFS 2026
        </h1>
        <button
          className="btn-secondary text-xs"
          onClick={() => {
            sessionStorage.removeItem(TOKEN_KEY);
            setAuthed(false);
            setToken('');
          }}
        >
          Abmelden
        </button>
      </header>

      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      {data && (
        <>
          <details className="card mt-2" open={false}>
            <summary className="cursor-pointer select-none text-sm font-semibold uppercase text-slate-500">
              Karte: Treffpunkte verschieben
            </summary>
            <div className="mt-3">
              <MapEditor
                meetingPoints={data.meeting_points}
                plan={data.map.plan}
                markerBox={data.map.marker_box}
                slots={data.slots.map(s => ({ id: s.slot.id, name: s.slot.name }))}
                token={token}
                onError={setErr}
                onChanged={() => load(token)}
              />
            </div>
          </details>

          <details className="card mt-2" open={false}>
            <summary className="cursor-pointer select-none text-sm font-semibold uppercase text-slate-500">
              Teilnehmer: Passwort zurücksetzen
            </summary>
            <div className="mt-3">
              <ParticipantsEditor
                participants={data.participants_all}
                token={token}
                onError={setErr}
                onChanged={() => load(token)}
              />
            </div>
          </details>

          <details className="card mt-2" open={false}>
            <summary className="cursor-pointer select-none text-sm font-semibold uppercase text-slate-500">
              Nachrichten an Teilnehmer
            </summary>
            <div className="mt-3">
              <MessagesEditor
                participants={data.participants_all}
                token={token}
                onError={setErr}
              />
            </div>
          </details>

          <details className="card mt-2" open={false}>
            <summary className="cursor-pointer select-none text-sm font-semibold uppercase text-slate-500">
              Backup &amp; Restore
            </summary>
            <div className="mt-3">
              <BackupRestore token={token} onError={setErr} />
            </div>
          </details>

          <h2 className="mt-6 text-sm font-semibold uppercase text-slate-500">Slots</h2>
          <div className="mt-2 space-y-2">
            {data.slots.map(s => (
              <SlotCard
                key={s.slot.id}
                slot={s}
                data={data}
                token={token}
                onChanged={() => load(token)}
                onError={setErr}
              />
            ))}
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase text-slate-500">
            Themen ({data.topics.length})
          </h2>
          <div className="mt-2 space-y-2">
            {data.topics.map(t => {
              const parts = data.participants[t.id] ?? [];
              return (
                <div key={t.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{t.title}</div>
                      <div className="text-xs text-slate-500">
                        von {t.owner_name} · {t.interest_count} Interessenten
                      </div>
                      {t.description && (
                        <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                      )}
                    </div>
                    <button
                      className="btn-danger shrink-0"
                      onClick={() => removeTopic(t.id)}
                    >
                      Entfernen
                    </button>
                  </div>
                  {parts.length > 0 && (
                    <details className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <summary className="cursor-pointer select-none text-slate-700">
                        Teilnehmer ({parts.length})
                      </summary>
                      <ol className="mt-2 list-decimal space-y-0.5 pl-6 text-slate-700">
                        {parts.map((p, i) => (
                          <li key={i}>
                            <span>{p.name}</span>
                            {p.name === t.owner_name && i === 0 && (
                              <span className="ml-2 chip-primary">Hutträger</span>
                            )}
                            <span className="ml-2 text-xs text-slate-400">
                              {new Date(p.joined_at).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              );
            })}
            {data.topics.length === 0 && (
              <div className="card text-center text-slate-500">
                Noch keine Themen.
              </div>
            )}
          </div>

          {data.removed.length > 0 && (
            <>
              <h2 className="mt-6 text-sm font-semibold uppercase text-slate-500">
                Entfernt ({data.removed.length})
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-500">
                {data.removed.map(r => (
                  <li key={r.id}>
                    {r.title} · {r.owner_name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MapEditor({
  meetingPoints,
  plan,
  markerBox,
  slots,
  token,
  onError,
  onChanged,
}: {
  meetingPoints: MeetingPoint[];
  plan: string;
  markerBox: MarkerBox;
  slots: Array<{ id: string; name: string }>;
  token: string;
  onError: (m: string) => void;
  onChanged: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(meetingPoints.map(mp => [mp.id, { x: mp.x, y: mp.y }])),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  // Letzter bestätigter Wert für Rollback bei Fehler
  const lastSaved = useRef<Record<string, { x: number; y: number }>>(
    Object.fromEntries(meetingPoints.map(mp => [mp.id, { x: mp.x, y: mp.y }])),
  );

  useEffect(() => {
    if (dragging) return;
    const next = Object.fromEntries(
      meetingPoints.map(mp => [mp.id, { x: mp.x, y: mp.y }]),
    );
    setPositions(next);
    lastSaved.current = next;
  }, [meetingPoints, dragging]);

  function handlePointerDown(id: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragging(id);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPositions(p => ({ ...p, [dragging]: { x, y } }));
  }

  async function handlePointerUp() {
    if (!dragging) return;
    const id = dragging;
    const pos = positions[id];
    setDragging(null);
    if (!pos) return;
    // Wenn sich nichts geändert hat, kein Request
    const prev = lastSaved.current[id];
    if (prev && Math.abs(prev.x - pos.x) < 0.0005 && Math.abs(prev.y - pos.y) < 0.0005) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/meeting-points/${id}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(pos),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Speichern fehlgeschlagen');
        setPositions(p => ({ ...p, [id]: lastSaved.current[id] }));
        return;
      }
      lastSaved.current = { ...lastSaved.current, [id]: pos };
      onChanged();
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
      setPositions(p => ({ ...p, [id]: lastSaved.current[id] }));
    }
  }

  async function reset(id: string) {
    try {
      const res = await fetch(`/api/admin/meeting-points/${id}/position`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Zurücksetzen fehlgeschlagen');
        return;
      }
      onChanged();
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    }
  }

  async function toggleSlot(mp: MeetingPoint, slotId: string) {
    const active = mp.slots.includes(slotId);
    const next = active
      ? mp.slots.filter(s => s !== slotId)
      : [...mp.slots, slotId];
    try {
      const res = await fetch(`/api/admin/meeting-points/${mp.id}/slots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ slots: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Speichern fehlgeschlagen');
        return;
      }
      onChanged();
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    }
  }

  async function resetSlots(id: string) {
    try {
      const res = await fetch(`/api/admin/meeting-points/${id}/slots`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Zurücksetzen fehlgeschlagen');
        return;
      }
      onChanged();
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-slate-300 bg-slate-50"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plan}
          alt="Lageplan Community Exchange"
          className="block w-full select-none"
          draggable={false}
        />
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/85 px-1.5 py-0.5 text-[11px] text-slate-500 shadow-sm">
          Treffpunkte zum Verschieben ziehen
        </div>
        {/* Marker-Box: fix verdrahtet aus config.yaml (map.marker_box), nur zur
            Orientierung sichtbar — die Marker liegen innerhalb. */}
        <div
          className="pointer-events-none absolute rounded-lg border border-dashed border-slate-400 bg-white/40"
          style={{
            left: `${markerBox.x * 100}%`,
            top: `${markerBox.y * 100}%`,
            width: `${markerBox.w * 100}%`,
            height: `${markerBox.h * 100}%`,
          }}
        >
          <div className="px-2 pt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Treffpunkte (fix)
          </div>
        </div>
        {meetingPoints.map(mp => {
          const p = positions[mp.id] ?? { x: mp.x, y: mp.y };
          const active = dragging === mp.id;
          return (
            <div
              key={mp.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            >
              <div
                onPointerDown={e => handlePointerDown(mp.id, e)}
                className={`select-none rounded-full border-2 px-3 py-1 text-xs shadow-sm ${
                  active
                    ? 'cursor-grabbing border-jfs-primary bg-white ring-2 ring-jfs-primary/40'
                    : 'cursor-grab border-slate-500 bg-white'
                }`}
                style={{ touchAction: 'none' }}
              >
                <div className="font-semibold">{mp.name}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 divide-y divide-slate-100 text-xs text-slate-600">
        {meetingPoints.length === 0 && (
          <div className="py-2 text-slate-500">
            Keine Treffpunkte konfiguriert.
          </div>
        )}
        {meetingPoints.map(mp => (
          <div key={mp.id} className="py-2 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="font-medium">{mp.name}</span>{' '}
                <span className="text-slate-400">
                  ({(positions[mp.id]?.x ?? mp.x).toFixed(2)},{' '}
                  {(positions[mp.id]?.y ?? mp.y).toFixed(2)})
                </span>
              </span>
              <button
                className="text-slate-500 hover:text-slate-800"
                onClick={() => reset(mp.id)}
                title="Position auf Config-Default zurücksetzen"
              >
                ↺ Position
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="mr-1 text-slate-500">Slots:</span>
              {slots.map(s => {
                const active = mp.slots.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSlot(mp, s.id)}
                    className={
                      'rounded-full border px-2 py-0.5 text-[11px] transition ' +
                      (active
                        ? 'border-jfs-primary bg-jfs-primary/10 text-jfs-primary'
                        : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400')
                    }
                    title={
                      active
                        ? `${s.name} deaktivieren`
                        : `${s.name} aktivieren`
                    }
                  >
                    {active ? '✓ ' : ''}
                    {s.name}
                  </button>
                );
              })}
              <button
                className="ml-2 text-slate-500 hover:text-slate-800"
                onClick={() => resetSlots(mp.id)}
                title="Slot-Verfügbarkeit auf Config-Default zurücksetzen"
              >
                ↺ Slots
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SlotCard({
  slot,
  data,
  token,
  onChanged,
  onError,
}: {
  slot: SlotStatus;
  data: Overview;
  token: string;
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Initialmapping: Treffpunkt-ID → Topic-ID | null aus aktuellen Zuweisungen
  const venues = data.meeting_points.filter(mp => mp.slots.includes(slot.slot.id));
  const initial: Record<string, string | null> = {};
  for (const mp of venues) {
    const a = slot.assignments.find(x => x.meeting_point_id === mp.id);
    initial[mp.id] = a?.topic_id ?? null;
  }
  const [mapping, setMapping] = useState<Record<string, string | null>>(initial);

  // Mapping zurücksetzen, wenn neue Daten geladen werden
  useEffect(() => {
    if (!editing) setMapping(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function runMatching() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/slots/${slot.slot.id}/match`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Matching fehlgeschlagen');
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/slots/${slot.slot.id}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ meeting_points: mapping }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Speichern fehlgeschlagen');
        return;
      }
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  // Topics, die bereits in einem früheren Slot erfolgreich zugeteilt sind,
  // dürfen nicht erneut platziert werden (spiegelt die Auto-Matching-Regel).
  const earlierSlotIds = new Set(
    [...data.slots]
      .filter(
        s =>
          new Date(s.slot.start).getTime() < new Date(slot.slot.start).getTime(),
      )
      .map(s => s.slot.id),
  );
  const blockedByEarlier = new Set<string>();
  for (const s of data.slots) {
    if (!earlierSlotIds.has(s.slot.id)) continue;
    for (const a of s.assignments) if (a.meeting_point_id) blockedByEarlier.add(a.topic_id);
  }

  const usedInMapping = new Set(Object.values(mapping).filter(Boolean) as string[]);
  const availableTopics = data.topics.filter(t => !blockedByEarlier.has(t.id));

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{slot.slot.name}</div>
          <div className="text-xs text-slate-500">
            {new Date(slot.slot.start).toLocaleDateString('de-DE')} · Cutoff −
            {slot.slot.cutoff_minutes} Min
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slot.matched ? (
            <span className="chip-success">zugeteilt</span>
          ) : slot.cutoffPassed ? (
            <span className="chip-warn">Matching ausstehend</span>
          ) : (
            <span className="chip">offen</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!slot.matched && (
          <button
            className="btn-primary text-xs"
            disabled={busy}
            onClick={runMatching}
          >
            🚀 Matching jetzt starten
          </button>
        )}
        <button
          className="btn-secondary text-xs"
          onClick={() => setEditing(v => !v)}
        >
          {editing ? 'Abbrechen' : 'Manuell bearbeiten'}
        </button>
      </div>

      {!editing && slot.assignments.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {slot.assignments.map(a => (
            <li key={a.topic_id} className="flex justify-between">
              <span>
                {a.topic_title} → <strong>{a.meeting_point_name}</strong>
              </span>
              <span className="text-slate-500">{a.interest_count} Interess.</span>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <div className="mb-2 text-xs text-slate-500">
            Pro Treffpunkt ein Thema wählen. „— leer lassen —" entfernt die
            Zuweisung. Ein Thema kann nur an einem Treffpunkt stehen.
          </div>
          <div className="space-y-2">
            {venues.map(mp => {
              const current = mapping[mp.id];
              return (
                <div
                  key={mp.id}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    <div className="font-medium">{mp.name}</div>
                    <div className="text-xs text-slate-500">Kapazität {mp.capacity}</div>
                  </div>
                  <select
                    className="input sm:w-80"
                    value={current ?? ''}
                    onChange={e =>
                      setMapping(m => ({
                        ...m,
                        [mp.id]: e.target.value === '' ? null : e.target.value,
                      }))
                    }
                  >
                    <option value="">— leer lassen —</option>
                    {availableTopics.map(t => {
                      const takenElsewhere =
                        usedInMapping.has(t.id) && current !== t.id;
                      return (
                        <option key={t.id} value={t.id} disabled={takenElsewhere}>
                          {t.title} ({t.interest_count} Int.)
                          {takenElsewhere ? ' — schon vergeben' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}
            {venues.length === 0 && (
              <div className="text-sm text-slate-500">
                Für diesen Slot ist kein Treffpunkt aktiv.
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="btn-secondary text-xs"
              onClick={() => {
                setMapping(initial);
                setEditing(false);
              }}
            >
              Verwerfen
            </button>
            <button className="btn-primary text-xs" disabled={busy} onClick={save}>
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParticipantsEditor({
  participants,
  token,
  onError,
  onChanged,
}: {
  participants: AdminParticipant[];
  token: string;
  onError: (m: string) => void;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [pw, setPw] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const MAX_VISIBLE = 15;
  const q = filter.trim().toLowerCase();
  const matches =
    q.length >= 2
      ? participants.filter(p => p.name.toLowerCase().includes(q))
      : [];
  const shown = matches.slice(0, MAX_VISIBLE);
  const hidden = matches.length - shown.length;

  async function setPassword(id: string) {
    const value = (pw[id] ?? '').trim();
    if (value.length < 4) {
      onError('Passwort muss mindestens 4 Zeichen haben.');
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/participants/${id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ password: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Speichern fehlgeschlagen');
        return;
      }
      setPw(s => ({ ...s, [id]: '' }));
      setDoneId(id);
      setTimeout(() => setDoneId(d => (d === id ? null : d)), 2500);
      onChanged();
    } catch (e) {
      onError((e as Error).message || 'Netzwerkfehler');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <p className="text-xs text-slate-500">
        Setzt am Infostand ein neues Passwort für einen Teilnehmer, der seines
        vergessen hat. Das neue Passwort dem Teilnehmer mündlich mitteilen — es
        wird gehasht gespeichert und ist später nicht mehr auslesbar.
      </p>
      <input
        className="input mt-3"
        placeholder="Teilnehmer suchen…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      {participants.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">Noch keine Teilnehmer.</div>
      ) : q.length < 2 ? (
        <div className="mt-3 text-sm text-slate-500">
          {participants.length} Teilnehmer insgesamt. Tippe mindestens 2
          Zeichen des Namens, um die Liste anzuzeigen.
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">Keine Treffer.</div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">
          {matches.length === 1
            ? '1 Treffer'
            : `${matches.length} Treffer`}
          {hidden > 0 && ` — die ersten ${MAX_VISIBLE} angezeigt, bitte Suche verfeinern.`}
        </div>
      )}
      <ul className="mt-3 divide-y divide-slate-100">
        {shown.map(p => (
          <li
            key={p.participant_id}
            className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-sm">
              <span className="font-medium">{p.name}</span>
              {!p.has_password && (
                <span className="ml-2 chip-warn">kein Passwort</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input sm:w-56"
                placeholder="neues Passwort"
                value={pw[p.participant_id] ?? ''}
                onChange={e =>
                  setPw(s => ({ ...s, [p.participant_id]: e.target.value }))
                }
                onKeyDown={e =>
                  e.key === 'Enter' && setPassword(p.participant_id)
                }
              />
              <button
                className="btn-primary shrink-0 text-xs"
                disabled={savingId === p.participant_id}
                onClick={() => setPassword(p.participant_id)}
              >
                {savingId === p.participant_id
                  ? '…'
                  : doneId === p.participant_id
                    ? '✓ gesetzt'
                    : 'Setzen'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Sektion „Nachrichten an Teilnehmer" — Admin sucht einen Teilnehmer, tippt
 * eine Nachricht, schickt sie ab. Darunter Liste aller eigenen Nachrichten
 * mit Status (Ungelesen / Beantwortet / Kommt am Info-Stand) und ggf. der
 * Antwort des Teilnehmers.
 */
function MessagesEditor({
  participants,
  token,
  onError,
}: {
  participants: AdminParticipant[];
  token: string;
  onError: (m: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [recipient, setRecipient] = useState<AdminParticipant | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const q = filter.trim().toLowerCase();
  const MAX_VISIBLE = 15;
  const matches =
    q.length >= 2 ? participants.filter(p => p.name.toLowerCase().includes(q)) : [];
  const shown = matches.slice(0, MAX_VISIBLE);
  const hidden = matches.length - shown.length;

  async function loadMessages() {
    setLoadingMsgs(true);
    try {
      const res = await fetch('/api/admin/messages', {
        cache: 'no-store',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Laden fehlgeschlagen');
        return;
      }
      const json = (await res.json()) as { messages: AdminMessage[] };
      setMessages(json.messages);
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // alle 15s nachladen, damit Antworten der Teilnehmer auftauchen
    const iv = setInterval(loadMessages, 15_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function send() {
    const text = body.trim();
    if (!recipient) {
      onError('Bitte zuerst einen Teilnehmer auswählen.');
      return;
    }
    if (text.length < 1 || text.length > 500) {
      onError('Nachricht muss 1–500 Zeichen lang sein.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          recipient_participant_id: recipient.participant_id,
          body: text,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Senden fehlgeschlagen');
        return;
      }
      setBody('');
      setRecipient(null);
      setFilter('');
      await loadMessages();
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(id: number) {
    if (!confirm('Nachricht aus der Liste entfernen?')) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Löschen fehlgeschlagen');
        return;
      }
      await loadMessages();
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    } finally {
      setRemovingId(null);
    }
  }

  const statusLabel = (s: AdminMessage['status']) =>
    s === 'unread'
      ? { text: 'ungelesen', cls: 'chip-warn' }
      : s === 'replied'
        ? { text: 'beantwortet', cls: 'chip-success' }
        : { text: 'Info-Stand', cls: 'chip-primary' };

  return (
    <>
      <p className="text-xs text-slate-500">
        Schickt eine Nachricht an einen bestimmten Teilnehmer (z.B.
        Klärungsfrage). Der Empfänger sieht beim nächsten Aufruf ein Modal
        und kann antworten oder „Komme am Info-Stand vorbei" wählen.
      </p>

      {/* Empfänger-Auswahl */}
      <label className="label mt-3">Empfänger</label>
      {recipient ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <span className="font-medium">{recipient.name}</span>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800"
            onClick={() => setRecipient(null)}
          >
            ändern
          </button>
        </div>
      ) : (
        <>
          <input
            className="input"
            placeholder="Teilnehmer suchen (min. 2 Zeichen)…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {q.length >= 2 && matches.length === 0 && (
            <div className="mt-2 text-xs text-slate-500">Keine Treffer.</div>
          )}
          {shown.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {shown.map(p => (
                <li key={p.participant_id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setRecipient(p);
                      setFilter('');
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-slate-400">auswählen</span>
                  </button>
                </li>
              ))}
              {hidden > 0 && (
                <li className="px-3 py-2 text-xs text-slate-500">
                  + {hidden} weitere — bitte Suche verfeinern.
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {/* Nachricht */}
      <label className="label mt-3">Nachricht</label>
      <textarea
        className="input min-h-20"
        maxLength={500}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={"z.B. „Hallo Anna, dein Thema „Java“ hat noch keinen klaren Bezug — meinst du das ernst? Bitte am Info-Stand kurz melden.“"}
      />
      <div className="mt-3 flex justify-end">
        <button
          className="btn-primary text-sm"
          disabled={sending || !recipient || body.trim().length === 0}
          onClick={send}
        >
          {sending ? 'Sende…' : 'Nachricht senden'}
        </button>
      </div>

      {/* Verlauf */}
      <h3 className="mt-5 text-xs font-semibold uppercase text-slate-500">
        Verlauf {loadingMsgs && '· lädt…'}
      </h3>
      {messages.length === 0 && (
        <div className="mt-2 text-sm text-slate-500">
          Noch keine Nachrichten gesendet.
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {messages.map(m => {
          const s = statusLabel(m.status);
          return (
            <li
              key={m.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{m.recipient_name}</span>{' '}
                  <span className={s.cls}>{s.text}</span>
                </div>
                <button
                  type="button"
                  disabled={removingId === m.id}
                  onClick={() => removeMessage(m.id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                  title="Aus der Liste entfernen"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{m.body}</p>
              {m.reply_body && (
                <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-emerald-900">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Antwort
                  </div>
                  <p className="whitespace-pre-wrap">{m.reply_body}</p>
                </div>
              )}
              <div className="mt-2 text-[11px] text-slate-400">
                {new Date(m.created_at).toLocaleString('de-DE')}
                {m.resolved_at && (
                  <>
                    {' · erledigt '}
                    {new Date(m.resolved_at).toLocaleString('de-DE')}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Sektion „Backup & Restore" — Admin kann einen konsistenten SQLite-Snapshot
 * herunterladen und auch wieder einspielen. Vor dem Restore wird der
 * jetzige Stand automatisch im data-Volume gesichert.
 */
function BackupRestore({
  token,
  onError,
}: {
  token: string;
  onError: (m: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [lastBackupName, setLastBackupName] = useState<string | null>(null);

  async function backup() {
    setDownloading(true);
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: String(res.status) }));
        onError(j.error ?? 'Backup fehlgeschlagen');
        return;
      }
      const blob = await res.blob();
      // Dateinamen aus Content-Disposition lesen oder fallback bauen
      const cd = res.headers.get('Content-Disposition') ?? '';
      const m = cd.match(/filename="?([^"]+)"?/);
      const name =
        m?.[1] ?? `comex-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    } finally {
      setDownloading(false);
    }
  }

  async function restore() {
    if (!file) {
      onError('Bitte zuerst eine Backup-Datei wählen.');
      return;
    }
    if (
      !confirm(
        `Aktuelle Datenbank durch "${file.name}" ersetzen?\n\n` +
          'Der jetzige Stand wird vorher automatisch gesichert ' +
          '(bof-pre-restore-<timestamp>.sqlite im data-Volume).',
      )
    ) {
      return;
    }
    setRestoring(true);
    try {
      const fd = new FormData();
      fd.append('backup', file);
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        pre_restore_backup?: string;
      };
      if (!res.ok || !j.ok) {
        onError(j.error ?? `Restore fehlgeschlagen (${res.status})`);
        return;
      }
      setLastBackupName(j.pre_restore_backup ?? null);
      setFile(null);
      // Seite neu laden, damit der Admin den frischen Stand sieht
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      onError((err as Error).message || 'Netzwerkfehler');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <p className="text-xs text-slate-500">
        Lädt einen konsistenten Snapshot der SQLite-Datenbank herunter oder
        spielt einen wieder ein. Backup ist online-konsistent (kein Stoppen
        nötig); vor einem Restore wird der aktuelle Stand automatisch als
        <code className="mx-1 rounded bg-slate-100 px-1">bof-pre-restore-…</code>
        gesichert.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <button
          className="btn-primary text-sm"
          disabled={downloading}
          onClick={backup}
        >
          {downloading ? 'Erzeuge…' : '⬇ Backup herunterladen'}
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
        <div className="font-semibold text-amber-900">Restore aus Datei</div>
        <p className="mt-1 text-xs text-amber-800">
          Die Datei muss ein Backup dieser App sein (Tabellen{' '}
          <code>participants</code>, <code>topics</code>, …). Während des
          Tausches können einzelne Requests kurz fehlschlagen — Teilnehmer
          sehen das als kurzen Aussetzer. Am besten außerhalb der
          Event-Zeit machen.
        </p>
        <input
          type="file"
          accept=".sqlite,.db,application/octet-stream"
          className="mt-3 block w-full text-xs"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="btn-danger mt-3 text-sm"
          disabled={!file || restoring}
          onClick={restore}
        >
          {restoring ? 'Spiele ein…' : '↻ Restore starten'}
        </button>
        {lastBackupName && (
          <p className="mt-2 text-xs text-emerald-700">
            Restore ok. Pre-Restore-Backup: <code>{lastBackupName}</code>. Seite
            lädt gleich neu…
          </p>
        )}
      </div>
    </>
  );
}
