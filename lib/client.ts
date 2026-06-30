'use client';

const PID_KEY = 'bof.pid';
const NAME_KEY = 'bof.name';

function rand(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getParticipantId(): string {
  if (typeof window === 'undefined') return '';
  let pid = localStorage.getItem(PID_KEY);
  if (!pid) {
    pid = rand();
    localStorage.setItem(PID_KEY, pid);
  }
  return pid;
}

export function getStoredName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}

export function setStoredName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function clearStoredName(): void {
  localStorage.removeItem(NAME_KEY);
}

/**
 * Überschreibt die Participant-ID — z.B. nach dem Login auf einem neuen
 * Gerät, wo der Server die bestehende ID des Accounts zurückliefert.
 */
export function setParticipantId(id: string): void {
  localStorage.setItem(PID_KEY, id);
}

/** Meldet vollständig ab: ID und Name werden lokal entfernt. */
export function logout(): void {
  localStorage.removeItem(PID_KEY);
  localStorage.removeItem(NAME_KEY);
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-participant-id': getParticipantId(),
  };
}

/**
 * Fehler mit HTTP-Status. `status === 0` bedeutet Netzwerk-/Transport-Fehler
 * (fetch hat rejected), nicht eine erreichte, aber ablehnende Server-Antwort.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j?.error ?? `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      cache: 'no-store',
      headers: { 'x-participant-id': getParticipantId() },
    });
  } catch (e) {
    throw new ApiError((e as Error).message || 'Netzwerkfehler', 0);
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError((e as Error).message || 'Netzwerkfehler', 0);
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: 'DELETE', headers: headers() });
  } catch (e) {
    throw new ApiError((e as Error).message || 'Netzwerkfehler', 0);
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json() as Promise<T>;
}
