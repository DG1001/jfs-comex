// Vortragsprogramm Java Forum Stuttgart 2026 — Stand: Scrape von
// https://www.java-forum-stuttgart.de/vortraege/2026/ am 2026-06-27.
// Falls Vortragende ausfallen oder ein Vortrag verschoben wird: hier
// editieren und Container neu starten (kein Build nötig — wird zur
// Laufzeit aus dem JSON-Modul gelesen).

export interface ProgrammTalk {
  track: string; // "A".."G"
  room: string; // z.B. "A1"
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
      { track: 'A', room: 'A1', title: 'Raus aus der Multi-Stack-Falle', speakers: ['Stephan Wald'] },
      { track: 'B', room: 'B1', title: 'Endlich Jarvis! – Deinen Persönlichen KI-Assistenten selbst betreiben', speakers: ['Oliver Eichler'] },
      { track: 'C', room: 'C1', title: 'Vektordatenbanken', speakers: ['Prof. Dr. Olaf Herden'] },
      { track: 'D', room: 'D1', title: 'Der Keycloak-Fehler, den 90% aller Entwickler:innen machen', speakers: ['Niko Köbler'] },
      { track: 'E', room: 'E1', title: 'Data-Oriented Programming', speakers: ['Dr. Mike Sperber'] },
      { track: 'F', room: 'F1', title: 'From Kitchen to Table', speakers: ['Dmitry Chuyko'] },
      { track: 'G', room: 'G1', title: 'Speed Dating Java Secrets', speakers: ['Bernd Müller'] },
    ],
  },
  {
    start: '09:50',
    end: '10:35',
    talks: [
      { track: 'A', room: 'A2', title: 'Beyond local tools: Deep dive into Agentic AI patterns with Spring AI', speakers: ['M.Sc. Arnaud Jean'] },
      { track: 'B', room: 'B2', title: 'Dein Coding Agent belügt dich nicht – er vergisst dich', speakers: ['Frederik Wystup'] },
      { track: 'C', room: 'C2', title: 'Apps für alle: Accessibility als Mobile Entwickler', speakers: ['Giulia Maier'] },
      { track: 'D', room: 'D2', title: 'Die All Stars der Software Bugs, Staffel 2', speakers: ['Christian Seifert'] },
      { track: 'E', room: 'E2', title: 'Zehn goldene Regeln, um dein Softwareprojekt zuverlässig zu ruinieren', speakers: ['Andreas Monschau'] },
      { track: 'F', room: 'F2', title: 'Skalierbare CI-Pipelines im Enterprise Umfeld', speakers: ['Johannes Dienst'] },
      { track: 'G', room: 'G2', title: 'Datenbank-Auditierung mit Spring Data JPA und Envers', speakers: ['Julius Mischok'] },
    ],
  },
  {
    start: '11:10',
    end: '11:55',
    talks: [
      { track: 'A', room: 'A3', title: 'Spring ohne Magie – die Welt von Ktor', speakers: ['Christian Babsek'] },
      { track: 'B', room: 'B3', title: 'Was ich aus 9 Produktionsanwendungen mit Claude Code gelernt habe', speakers: ['Karsten Silz'] },
      { track: 'C', room: 'C3', title: 'Data Streaming im IoT', speakers: ['Thomas Müller'] },
      { track: 'D', room: 'D3', title: 'Zwischen ACID, Eventual und Chaos: Konsistenz in verteilten Systemen', speakers: ['Frank Scheffler', 'Nikolai Neugebauer'] },
      { track: 'E', room: 'E3', title: 'CRA, NIS2, DORA: What Senior Java Engineers Must Deliver Before 2027', speakers: ['M.Sc. Ixchel Ruiz'] },
      { track: 'F', room: 'F3', title: 'Endlich Embeddings verstehen – und nie wieder nach dem richtigen Emoji suchen müssen!', speakers: ['Dr. Dennis Schulz', 'Elias Schecke'] },
      { track: 'G', room: 'G3', title: 'Scotty I need Warp Speed', speakers: ['Gerrit Grunwald'] },
    ],
  },
  {
    start: '12:15',
    end: '13:00',
    talks: [
      { track: 'A', room: 'A4', title: 'So macht die Wartung von Maven-Projekten wieder Spaß', speakers: ['Sandra Parsick'] },
      { track: 'B', room: 'B4', title: 'Inside Agentic AI: Deep Dive in moderne Orchestrierungs-Frameworks', speakers: ['Ingo Düppe'] },
      { track: 'C', room: 'C4', title: 'The Seven Deadly Sins of Software Architecture', speakers: ['Sven Müller'] },
      { track: 'D', room: 'D4', title: 'Entkopplung durch Events: Event-Driven Architecture konsequent zu Ende gedacht', speakers: ['Nicolai Mainiero'] },
      { track: 'E', room: 'E4', title: 'Agentic Software Modernization: Back to the Roots', speakers: ['Markus Harrer'] },
      { track: 'F', room: 'F4', title: 'Java Next', speakers: ['Nicolai Parlog'] },
      { track: 'G', room: 'G4', title: 'Kotlin kontra Java – Braucht man 2026 überhaupt noch Kotlin', speakers: ['M.Sc. Richard Gross'] },
    ],
  },
  {
    start: '14:30',
    end: '15:15',
    talks: [
      { track: 'A', room: 'A5', title: 'Schlanke Container mit Nix', speakers: ['Dr. Stefan Schlott'] },
      { track: 'B', room: 'B5', title: 'Open Claw für Enterprise Java Entwickler', speakers: ['Christian Dedek'] },
      { track: 'C', room: 'C5', title: 'Observability ohne Mühe', speakers: ['Heiko Rupp'] },
      { track: 'D', room: 'D5', title: 'Events sind Immutable, Anforderungen nicht', speakers: ['Benedikt Jerat', 'Kersten Kriegbaum'] },
      { track: 'E', room: 'E5', title: 'Java-Modernisierung: Hauche Deiner Codebase neues Leben ein, ohne die Bank zu sprengen', speakers: ['Richard Fichtner'] },
      { track: 'F', room: 'F5', title: 'Funktionale Programmierung in Java', speakers: ['Falk Sippach', 'Till Rauch'] },
      { track: 'G', room: 'G5', title: 'Mit dem Supertanker zur nächsten Insel', speakers: ['Edwin Günthner'] },
    ],
  },
  {
    start: '15:35',
    end: '16:20',
    talks: [
      { track: 'A', room: 'A6', title: 'Adieu Jenkins: warum wir über 100 Jenkins-Pipelines auf GitLab CI migriert haben', speakers: ['Lukas Pradel'] },
      { track: 'B', room: 'B6', title: 'Just like the simulations: Teaching robots to play chess', speakers: ['Thomas Endres', 'Jonas Mayer'] },
      { track: 'C', room: 'C6', title: 'Warum Ihre KI nicht erklären kann, was sie tut', speakers: ['Golo Roden'] },
      { track: 'D', room: 'D6', title: 'Von Sicherheitslücken und Compliance', speakers: ['Dr. Tobias Röhm'] },
      { track: 'E', room: 'E6', title: 'A Fool with a Tool: KI sinnvoll einsetzen statt nur nutzen', speakers: ['Peter Kirschner'] },
      { track: 'F', room: 'F6', title: 'Bestens integriert', speakers: ['Michael Wiedeking'] },
      { track: 'G', room: 'G6', title: 'Von Compressed OOPs bis Compact Headers: Java unter der Haube', speakers: ['Sven Woltmann'] },
    ],
  },
  {
    start: '16:40',
    end: '17:25',
    talks: [
      { track: 'A', room: 'A7', title: 'Dank HTMX ohne nodejs zum Java-Backend-lastigen Frontend', speakers: ['Sebastian Sprenger', 'Felix Seidel'] },
      { track: 'B', room: 'B7', title: 'Quantencomputing – Wie funktioniert es, wie wird es uns beeinflussen und wann?', speakers: ['Lorenzo Petricone', 'John Fletcher'] },
      { track: 'C', room: 'C7', title: 'Von OAuth zu Verifiable Credentials', speakers: ['Andreas Falk'] },
      { track: 'D', room: 'D7', title: 'Stop Praying, Start Testing', speakers: ['Leon Zimmermann'] },
      { track: 'E', room: 'E7', title: 'Codeanalyse im Dornröschenschlaf: Zeit, Ihr Tool zu wecken', speakers: ['M.Sc. Ann-Sophie Kracker'] },
      { track: 'F', room: 'F7', title: 'Things you can do with Spring Boot and Kotlin', speakers: ['Frederik Pietzko'] },
      { track: 'G', room: 'G7', title: 'Sollen wir lieber nach Babylon oder nach Panama fahren', speakers: ['Matthias Koch', 'M.Sc. Robert Palma'] },
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
