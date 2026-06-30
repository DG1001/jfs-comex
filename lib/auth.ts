import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Bewusst schlanke Passwort-Absicherung: scrypt mit zufälligem Salt, keine
// externe Abhängigkeit. Format des gespeicherten Werts:
//   scrypt:<saltHex>:<hashHex>
// Hinweis: Das Seed-Skript (scripts/seed-demo.mjs) erzeugt denselben Format-
// String — bei Änderungen hier dort mitziehen.

const KEYLEN = 32;

/** Erzeugt einen speicherbaren Hash für ein Klartext-Passwort. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Prüft ein Klartext-Passwort gegen einen gespeicherten Hash (timing-safe). */
export function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): boolean {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (expected.length === 0) return false;
  let actual: Buffer;
  try {
    actual = scryptSync(plain, salt, expected.length);
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
