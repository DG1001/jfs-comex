'use client';

import { useEffect } from 'react';

/**
 * Registriert den Service Worker (public/sw.js). Ohne Service Worker ist die
 * App nicht installierbar; schlägt die Registrierung fehl, läuft sie aber
 * ganz normal weiter.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* egal — App funktioniert auch ohne */
    });
  }, []);
  return null;
}
