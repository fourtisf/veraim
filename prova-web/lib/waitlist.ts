// Shared by the waitlist modal (browser) and the /api/waitlist route (server).
export const WAITLIST_SOURCES = ["wallet", "launch", "cta"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WALLET = /^0x[a-fA-F0-9]{40}$/;

// Returns the cleaned value, or null if it is neither an email nor an EVM wallet address.
export function normalizeEntry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (v.length > 254) return null;
  if (WALLET.test(v) || EMAIL.test(v)) return v.toLowerCase();
  return null;
}
