// Vortragsprogramm Java Forum Stuttgart 2026 — Stand: Scrape von
// https://www.java-forum-stuttgart.de/vortraege/2026/ am 2026-07-01
// (finales Programm inkl. Raumzuteilung). Die Säle sind feste Spalten
// (Beethoven, Mozart, Silcher, Hegel, Schiller, Bonn-Hamburg, Köln =
// Track A..G); `room` ist der Saal des jeweiligen Vortrags.
// Falls Vortragende ausfallen oder ein Vortrag verschoben wird: hier
// editieren und Container neu starten (kein Build nötig — wird zur
// Laufzeit aus dem JSON-Modul gelesen).

export interface ProgrammTalk {
  track: string; // Spalte/Track im Original-Raster, "A".."G"
  room: string; // Saal, z.B. "Beethoven Saal", "Bonn-Hamburg", "Köln"
  title: string;
  speakers: string[];
}

export interface ProgrammSlot {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  talks: ProgrammTalk[];
}

export const programmJfs2026: ProgrammSlot[] = [
  {
    start: '08:45',
    end: '09:30',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'Endlich Jarvis! – Deinen Persönlichen KI-Assistenten selbst betreiben', speakers: ['Oliver Eichler'] },
      { track: 'B', room: 'Mozart Saal', title: 'Data-Oriented Programming', speakers: ['Dr. Mike Sperber'] },
      { track: 'C', room: 'Silcher Saal', title: 'Speed Dating Java Secrets', speakers: ['Bernd Müller'] },
      { track: 'D', room: 'Hegel Saal', title: 'Der Keycloak-Fehler, den 90% aller Entwickler:innen machen (und wie du ihn vermeidest)', speakers: ['Niko Köbler'] },
      { track: 'E', room: 'Schiller Saal', title: 'Vektordatenbanken', speakers: ['Prof. Dr. Olaf Herden'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'From Kitchen to Table', speakers: ['Dmitry Chuyko'] },
      { track: 'G', room: 'Köln', title: 'Raus aus der Multi-Stack-Falle', speakers: ['Stephan Wald'] },
    ],
  },
  {
    start: '09:50',
    end: '10:35',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'Zehn goldene Regeln, um dein Softwareprojekt zuverlässig zu ruinieren', speakers: ['Andreas Monschau'] },
      { track: 'B', room: 'Mozart Saal', title: 'Beyond local tools: Deep dive into Agentic AI patterns with Spring AI', speakers: ['M.Sc. Arnaud Jean'] },
      { track: 'C', room: 'Silcher Saal', title: 'Just like the simulations: Teaching robots to play chess', speakers: ['Thomas Endres', 'Jonas Mayer'] },
      { track: 'D', room: 'Hegel Saal', title: 'Die All Stars der Software Bugs, Staffel 2', speakers: ['Christian Seifert'] },
      { track: 'E', room: 'Schiller Saal', title: 'Datenbank-Auditierung mit Spring Data JPA und Envers', speakers: ['Julius Mischok'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'Apps für alle: Accessibility als Mobile Entwickler', speakers: ['Giulia Maier'] },
      { track: 'G', room: 'Köln', title: 'Skalierbare CI-Pipelines im Enterprise Umfeld', speakers: ['Johannes Dienst'] },
    ],
  },
  {
    start: '11:10',
    end: '11:55',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'Was ich aus 9 Produktionsanwendungen mit Claude Code gelernt habe', speakers: ['Karsten Silz'] },
      { track: 'B', room: 'Mozart Saal', title: 'Endlich Embeddings verstehen – und nie wieder nach dem richtigen Emoji suchen müssen!', speakers: ['Dr. Dennis Schulz', 'Elias Schecke'] },
      { track: 'C', room: 'Silcher Saal', title: 'Scotty I need Warp Speed', speakers: ['Gerrit Grunwald'] },
      { track: 'D', room: 'Hegel Saal', title: 'Zwischen ACID, Eventual und Chaos: Konsistenz in verteilten Systemen', speakers: ['Frank Scheffler', 'Nikolai Neugebauer'] },
      { track: 'E', room: 'Schiller Saal', title: 'CRA, NIS2, DORA: What Senior Java Engineers Must Deliver Before 2027', speakers: ['M.Sc. Ixchel Ruiz'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'Spring ohne Magie – die Welt von Ktor', speakers: ['Christian Babsek'] },
      { track: 'G', room: 'Köln', title: 'Data Streaming im IoT', speakers: ['Thomas Müller'] },
    ],
  },
  {
    start: '12:15',
    end: '13:00',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'The Seven Deadly Sins of Software Architecture', speakers: ['Sven Müller'] },
      { track: 'B', room: 'Mozart Saal', title: 'Inside Agentic AI: Deep Dive in moderne Orchestrierungs-Frameworks', speakers: ['Ingo Düppe'] },
      { track: 'C', room: 'Silcher Saal', title: 'So macht die Wartung von Maven-Projekten wieder Spaß', speakers: ['Sandra Parsick'] },
      { track: 'D', room: 'Hegel Saal', title: 'Entkopplung durch Events: Event-Driven Architecture konsequent zu Ende gedacht', speakers: ['Nicolai Mainiero'] },
      { track: 'E', room: 'Schiller Saal', title: 'Agentic Software Modernization: Back to the Roots', speakers: ['Markus Harrer'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'Kotlin kontra Java – Braucht man 2026 überhaupt noch Kotlin', speakers: ['M.Sc. Richard Gross'] },
      { track: 'G', room: 'Köln', title: 'Java Next', speakers: ['Nicolai Parlog'] },
    ],
  },
  {
    start: '14:30',
    end: '15:15',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'Java-Modernisierung: Hauche Deiner Codebase neues Leben ein, ohne die Bank zu sprengen', speakers: ['Richard Fichtner'] },
      { track: 'B', room: 'Mozart Saal', title: 'Funktionale Programmierung in Java', speakers: ['Falk Sippach', 'Till Rauch'] },
      { track: 'C', room: 'Silcher Saal', title: 'Observability ohne Mühe', speakers: ['Heiko Rupp'] },
      { track: 'D', room: 'Hegel Saal', title: 'Open Claw für Enterprise Java Entwickler', speakers: ['Christian Dedek'] },
      { track: 'E', room: 'Schiller Saal', title: 'Events sind Immutable, Anforderungen nicht', speakers: ['Benedikt Jerat', 'Kersten Kriegbaum'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'Mit dem Supertanker zur nächsten Insel', speakers: ['Edwin Günthner'] },
      { track: 'G', room: 'Köln', title: 'Schlanke Container mit Nix', speakers: ['Dr. Stefan Schlott'] },
    ],
  },
  {
    start: '15:35',
    end: '16:20',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'Dein Coding Agent belügt dich nicht – er vergisst dich', speakers: ['Frederik Wystup'] },
      { track: 'B', room: 'Mozart Saal', title: 'A Fool with a Tool: KI sinnvoll einsetzen statt nur nutzen', speakers: ['Peter Kirschner'] },
      { track: 'C', room: 'Silcher Saal', title: 'Bestens integriert', speakers: ['Michael Wiedeking'] },
      { track: 'D', room: 'Hegel Saal', title: 'Warum Ihre KI nicht erklären kann, was sie tut', speakers: ['Golo Roden'] },
      { track: 'E', room: 'Schiller Saal', title: 'Adieu Jenkins: warum wir über 100 Jenkins-Pipelines auf GitLab CI migriert haben', speakers: ['Lukas Pradel'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'Von Compressed OOPs bis Compact Headers: Java unter der Haube', speakers: ['Sven Woltmann'] },
      { track: 'G', room: 'Köln', title: 'Von Sicherheitslücken und Compliance', speakers: ['Dr. Tobias Röhm'] },
    ],
  },
  {
    start: '16:40',
    end: '17:25',
    talks: [
      { track: 'A', room: 'Beethoven Saal', title: 'Quantencomputing – Wie funktioniert es, wie wird es uns beeinflussen und wann?', speakers: ['Lorenzo Petricone', 'John Fletcher'] },
      { track: 'B', room: 'Mozart Saal', title: 'Stop Praying, Start Testing', speakers: ['Leon Zimmermann'] },
      { track: 'C', room: 'Silcher Saal', title: 'Von OAuth zu Verifiable Credentials', speakers: ['Andreas Falk'] },
      { track: 'D', room: 'Hegel Saal', title: 'Dank HTMX ohne nodejs zum Java-Backend-lastigen Frontend', speakers: ['Sebastian Sprenger', 'Felix Seidel'] },
      { track: 'E', room: 'Schiller Saal', title: 'Codeanalyse im Dornröschenschlaf: Zeit, Ihr Tool zu wecken', speakers: ['M.Sc. Ann-Sophie Kracker'] },
      { track: 'F', room: 'Bonn-Hamburg', title: 'Things you can do with Spring Boot and Kotlin', speakers: ['Frederik Pietzko'] },
      { track: 'G', room: 'Köln', title: 'Sollen wir lieber nach Babylon oder nach Panama fahren', speakers: ['Matthias Koch', 'M.Sc. Robert Palma'] },
    ],
  },
];

/**
 * Liefert den Vortrags-Slot, der die übergebene Uhrzeit ("HH:MM") enthält
 * (Datum egal — nur Tageszeit), oder null wenn gerade Pause/Mittag ist.
 */
export function currentTalkSlot(hhmm: string): ProgrammSlot | null {
  return programmJfs2026.find(s => s.start <= hhmm && hhmm < s.end) ?? null;
}

/**
 * Phasen-Label für eine Uhrzeit — entweder ein Vortragsfenster, eine
 * benannte Pause/Mittagspause, oder "vor/nach dem Event".
 */
export function currentPhase(hhmm: string): {
  kind: 'before' | 'talk' | 'pause' | 'lunch' | 'after';
  label: string;
  slot?: ProgrammSlot;
} {
  if (hhmm < programmJfs2026[0].start) {
    return { kind: 'before', label: 'Konferenz beginnt um ' + programmJfs2026[0].start };
  }
  const last = programmJfs2026[programmJfs2026.length - 1];
  if (hhmm >= last.end) {
    return { kind: 'after', label: 'Konferenz beendet' };
  }
  const inTalk = currentTalkSlot(hhmm);
  if (inTalk) return { kind: 'talk', label: `Vorträge ${inTalk.start} – ${inTalk.end}`, slot: inTalk };
  // Zwischen 13:00 und 14:30 ist Mittagspause; sonst kurze Pause
  if (hhmm >= '13:00' && hhmm < '14:30') return { kind: 'lunch', label: 'Mittagspause' };
  return { kind: 'pause', label: 'Pause zwischen Vorträgen' };
}
