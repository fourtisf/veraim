// Small JSON fetch helper with a timeout and a short in-memory cache.
const cache = new Map<string, { at: number; data: unknown }>();

export async function getJson<T = any>(url: string, opts: { ttlMs?: number; timeoutMs?: number; headers?: Record<string, string> } = {}): Promise<T> {
  const { ttlMs = 30_000, timeoutMs = 10_000, headers = {} } = opts;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const res = await fetch(url, {
    // Blockscout returns an unparseable page to requests without a browser-like User-Agent.
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; VeraimBot/1.0; +https://veraim.xyz)", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  const data = (await res.json()) as T;
  cache.set(url, { at: Date.now(), data });
  if (cache.size > 2000) cache.clear();
  return data;
}
