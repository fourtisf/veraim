import type { Eip1193 } from "./walletProviders";

// Browser helpers for calling the Veraim API.
export class ApiError extends Error {
  constructor(message: string, public status: number, public data: any = {}) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", res.status, data);
  return data as T;
}

const toHex = (s: string) => "0x" + [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Sign in with the wallet the user picked: it signs a one-time message (no transaction, no gas).
export async function signInWithWallet(eth: Eip1193) {
  const [address] = await eth.request({ method: "eth_requestAccounts" });
  if (!address) throw new Error("Your wallet didn't share an address. Unlock it and try again.");
  const { message } = await api<{ message: string }>("/api/auth/challenge", { body: { address } });
  const signature = await eth.request({ method: "personal_sign", params: [toHex(message), address] });
  await api("/api/auth/verify", { body: { signature } });
}

// Wallet errors in plain words.
export function walletErrorMessage(err: unknown) {
  const code = (err as { code?: number })?.code;
  if (code === 4001 || /reject|denied|cancel/i.test((err as Error)?.message || "")) return "Request cancelled in your wallet.";
  if (code === -32002) return "Your wallet already has a request open. Open the wallet to finish it.";
  if (err instanceof ApiError) return err.message;
  return (err as Error)?.message || "Couldn't connect your wallet. Please try again.";
}
