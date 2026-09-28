// Simple in-memory rate limit: at most `limit` requests per IP per window.
// Fine for one server process (the PM2 setup in ecosystem.config.js runs one).
const hits = new Map<string, number[]>();

export function rateLimited(ip: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    // keep memory bounded: drop IPs with no recent requests
    hits.forEach((times, key) => { if (!times.some((t) => now - t < windowMs)) hits.delete(key); });
  }
  return recent.length > limit;
}
