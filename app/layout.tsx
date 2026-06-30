import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from './sw-register';

export const metadata: Metadata = {
  title: 'JFS 2026 — Community Exchange',
  description: 'Community Exchange für das Java Forum Stuttgart 2026',
  applicationName: 'JFS Exchange',
  appleWebApp: {
    capable: true,
    title: 'JFS Exchange',
    statusBarStyle: 'default',
  },
  // Standardisiertes Gegenstück zu apple-mobile-web-app-capable (Chrome).
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b4ea2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-jfs-bg antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
