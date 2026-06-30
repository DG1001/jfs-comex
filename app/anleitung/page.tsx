import Link from 'next/link';

// Statische Anleitung für Teilnehmende — Link kann frei verteilt werden.
// Kein Login nötig.

export const metadata = {
  title: 'Anleitung · Community Exchange JFS 2026',
  description:
    'Kurze Anleitung zur Community-Exchange-App des Java Forum Stuttgart 2026 — Themen einstellen, mitmachen, Treffpunkt finden.',
};

interface Screenshot {
  src: string;
  alt: string;
  caption: string;
}

function Shot({ src, alt, caption }: Screenshot) {
  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" />
      <figcaption className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function Anleitung() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          JFS 2026 · Community Exchange
        </div>
        <h1 className="mt-1 text-2xl font-bold">Anleitung</h1>
        <p className="mt-1 text-sm text-slate-600">
          So machst du beim Community Exchange am Donnerstag, 9. Juli 2026 mit —
          in fünf Minuten gelesen.
        </p>
      </header>

      <Section title="Was ist der Community Exchange?">
        <p>
          Zwischen den Vorträgen treffen sich Interessierte in der
          Community-Area des Hegel-Foyers zu offenen, kurzen Themen-Runden —
          Erfahrungsaustausch, kontroverse Diskussionen, Fragen an die Community
          („Wie macht ihr eigentlich…?"). Die App sammelt vor jeder Pause
          Themen-Vorschläge ein und verteilt die meistgewünschten automatisch
          auf die sechs Tische in der Community-Area (plus ggf. zwei
          Außen-Plätze bei gutem Wetter).
        </p>
      </Section>

      <Section title="Schritt 1 · Account anlegen">
        <p>
          Beim ersten Öffnen: Anzeigename und ein eigenes Passwort wählen.{' '}
          <strong>Keine E-Mail, kein Klarname nötig.</strong> Das Passwort
          brauchst du nur, falls du dich auf einem zweiten Gerät einloggen
          willst.
        </p>
        <Shot
          src="/anleitung/1-login.png"
          alt="Login-Maske mit Feldern für Anzeigename und Passwort"
          caption="Erstes Öffnen der App."
        />
      </Section>

      <Section title="Schritt 2 · Themen einstellen oder beitreten">
        <p>
          In der Themen-Liste siehst du alle vorgeschlagenen Themen.{' '}
          <strong>Mit „Mitmachen" markierst du Interesse</strong> — das hilft
          dem Matching zu entscheiden, welche Themen den begrenzten Plätzen
          zugeteilt werden. Hast du kein passendes Thema gefunden? Mit{' '}
          <strong>„+ Thema"</strong> schlägst du selbst eines vor.
        </p>
        <Shot
          src="/anleitung/2-topics.png"
          alt="Themen-Liste mit mehreren Vorschlägen"
          caption='Themen-Übersicht. „Mitmachen" markiert Interesse; ein bereits zugeteiltes Thema zeigt einen grünen Banner mit dem Treffpunkt.'
        />
        <Shot
          src="/anleitung/3-create.png"
          alt="Modal zum Erstellen eines neuen Themas"
          caption="Neues Thema einstellen. Titel ist Pflicht, Kurzbeschreibung optional. Wunsch-Slots auswählen erhöht die Chance auf einen passenden Termin."
        />
      </Section>

      <Section title="Schritt 3 · Treffpunkt finden">
        <p>
          Etwa <strong>60 Minuten vor jeder Pause</strong> ordnet die App die
          meistgewünschten Themen den Tischen zu. Wer einem zugeteilten Thema
          beigetreten ist, sieht den Treffpunkt direkt unter dem Thema und auf
          der Karte. <strong>Tipp:</strong> Karte reagiert auf Pinch-Zoom und
          Doppel-Tap (Zurücksetzen).
        </p>
        <Shot
          src="/anleitung/4-karte.png"
          alt="Karte des Hegel-Foyers mit nummerierten Treffpunkten"
          caption='Karte mit allen Treffpunkten. Die nummerierten Marker stehen in der Box rechts unten (= „Lupen-Ausschnitt" der Community-Area); zwei Außen-Plätze für gutes Wetter.'
        />
      </Section>

      <Section title="Während des Tages · Vortragsprogramm im Blick">
        <p>
          Oben rechts findest du den <strong>„📋 Programm"</strong>-Button. Er
          öffnet das komplette JFS-2026-Vortragsprogramm; der gerade laufende
          Slot ist grün hervorgehoben — praktisch, um beim Themen-Auswählen
          schnell zu sehen, wann eine Pause kommt.
        </p>
        <Shot
          src="/anleitung/5-programm.png"
          alt="Programm-Modal mit hervorgehobenem aktuellen Vortragsslot"
          caption='Programm-Übersicht mit „Jetzt"-Marker.'
        />
      </Section>

      <Section title="Deine eigenen Themen im Überblick">
        <p>
          Unter <strong>„Meine Themen"</strong> findest du dein eigenes Thema
          (falls du eines eingestellt hast) und alle Themen, bei denen du
          mitmachst — inklusive der zugeteilten Treffpunkte.
        </p>
        <Shot
          src="/anleitung/6-mine.png"
          alt="Liste der eigenen Themen mit Zuteilungen"
          caption='„Meine Themen" — fokussierte Ansicht ohne Ablenkung.'
        />
      </Section>

      <Section title="Tipps">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Frühzeitig anmelden</strong> — die Zuteilung läuft pro Slot
            ca. 60 Minuten vor Beginn; danach kannst du zwar noch mitmachen,
            aber nicht mehr ins Matching aufgenommen werden.
          </li>
          <li>
            <strong>Mehrere Wunsch-Slots eintragen</strong> — Themen mit
            flexibleren Wünschen werden eher in einen Slot gelegt.
          </li>
          <li>
            <strong>App als Startbildschirm-Icon</strong> — die App ist als
            PWA installierbar; im Browser-Menü „Zum Startbildschirm hinzufügen"
            wählen.
          </li>
          <li>
            <strong>Etwas unklar?</strong> Komm am Info-Stand vorbei — das Team
            kann dir auch eine kurze Klarstellungs-Nachricht direkt in die App
            schicken.
          </li>
        </ul>
      </Section>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-center">
        <Link href="/" className="text-jfs-primary underline">
          → Zur App
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}
