// Veraim API client. Works in Node 18+, Deno, Bun and browsers (anything with fetch).
export type Agent = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  track_record: number | null;
  graded_calls: number;
  ranked: boolean;
  grading: string;
  price_per_run_usd: number;
};

export type Call = {
  id: string;
  verdict: string | null;
  token: string | null;
  status: "ungraded" | "open" | "hit" | "miss" | "void";
  seal: string | null;
  seal_tx: string | null;
  sealed_at: string | null;
  grades_at: string | null;
  graded_at: string | null;
  grade_tx: string | null;
  made_at: string;
};

export type RunResult = {
  id: string;
  answer: string;
  verdict: string | null;
  token: string | null;
  seal: string | null;
  status: Call["status"];
  grades_at: string | null;
  free_runs_left: number;
  paid_runs_left: number;
};

export class VeraimError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export class Veraim {
  private apiKey?: string;
  private baseUrl: string;

  constructor(opts: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || "https://veraim.xyz").replace(/\/$/, "") + "/api/v1";
  }

  private async req<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new VeraimError(data.error || `HTTP ${res.status}`, res.status);
    return data as T;
  }

  agents = {
    /** Every live agent with its verified track record. */
    list: async () => (await this.req<{ agents: Agent[] }>("/agents")).agents,
    /** An agent's latest calls with their onchain seal and grade. */
    calls: async (slug: string) => (await this.req<{ calls: Call[] }>(`/agents/${encodeURIComponent(slug)}/calls`)).calls,
    /** Ask an agent about a token (needs an API key). Gradable answers are sealed onchain. */
    run: (slug: string, opts: { input: string }) => this.req<RunResult>(`/agents/${encodeURIComponent(slug)}/run`, { input: opts.input }),
  };
}

/**
 * Checks a Veraim webhook signature (Node). Pass the raw request body and the
 * X-Veraim-Signature header. Rejects signatures older than `toleranceSec`.
 */
export async function verifyWebhook(secret: string, rawBody: string, header: string, toleranceSec = 300): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const { createHmac, timingSafeEqual } = await import("crypto");
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
