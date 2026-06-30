import type { MetadataRoute } from 'next';

// Web-App-Manifest — macht die App installierbar („Zum Startbildschirm").
// Next.js verlinkt diese Datei automatisch im <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JFS 2026 · Community Exchange',
    short_name: 'JFS Exchange',
    description:
      'Community Exchange für das Java Forum Stuttgart 2026 — Themen ' +
      'einbringen, Mitstreiter finden, Treffpunkte sehen.',
    lang: 'de',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f7fb',
    theme_color: '#0b4ea2',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
