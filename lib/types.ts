export interface MeetingPoint {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  slots: string[];
}

export interface MapConfig {
  /** Pfad zur Hintergrund-SVG des Lageplans unterhalb von `public/`. */
  plan: string;
  /**
   * Visuelles "Schild" auf der Karte, in dem die Treffpunkt-Marker liegen
   * (Position + Größe in 0..1 Anteilen der Karte). Fix in config.yaml.
   */
  marker_box: MarkerBox;
  /**
   * Optional: dünner Leitpfeil von der Box zur tatsächlichen Community-Area
   * auf dem Lageplan (stellt den räumlichen Bezug her). Beide Punkte in
   * 0..1 Anteilen der Karte.
   */
  connector?: MapConnector;
}

export interface MarkerBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapConnector {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface Slot {
  id: string;
  name: string;
  start: string;
  end: string;
  cutoff_minutes: number;
}

export interface AppConfig {
  event: { name: string; timezone: string };
  matching: { min_interested: number };
  map: MapConfig;
  meeting_points: MeetingPoint[];
  slots: Slot[];
}

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  owner_name: string;
  // owner_id wird bewusst NICHT nach außen gegeben — die Participant-ID ist
  // das Login-Geheimnis (siehe lib/auth.ts / requireParticipant).
  preferred_slots: string[];
  created_at: number;
  removed: number;
  interest_count: number;
  is_owner?: boolean;
  is_interested?: boolean;
  assignment?: Assignment | null;
}

export interface AdminParticipant {
  participant_id: string;
  name: string;
  claimed_at: number;
  has_password: boolean;
}

export type AdminMessageStatus = 'unread' | 'replied' | 'dismissed';

export interface AdminMessage {
  id: number;
  recipient_participant_id: string;
  recipient_name: string;
  body: string;
  status: AdminMessageStatus;
  reply_body: string | null;
  created_at: number;
  resolved_at: number | null;
}

/** Nachricht aus Teilnehmer-Sicht (Status implizit „unread"). */
export interface IncomingMessage {
  id: number;
  body: string;
  created_at: number;
}

export interface Assignment {
  slot_id: string;
  topic_id: string;
  meeting_point_id: string | null;
  matched_at: number;
}

export interface SlotStatus {
  slot: Slot;
  cutoffPassed: boolean;
  matched: boolean;
  assignments: Array<{
    topic_id: string;
    topic_title: string;
    meeting_point_id: string | null;
    meeting_point_name: string | null;
    interest_count: number;
  }>;
}
