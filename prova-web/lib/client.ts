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

export class NoWalletError extends Error {}

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<any> };
const ethereum = () => (typeof window !== "undefined" ? ((window as any).ethereum as Eth | undefined) : undefined);
const toHex = (s: string) => "0x" + [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Sign in with an injected wallet (MetaMask, Rabby, Coinbase, a wallet app's browser…).
export async function signInWithWallet() {
  const eth = ethereum();
  if (!eth) throw new NoWalletError();
  const [address] = await eth.request({ method: "eth_requestAccounts" });
  const { message } = await api<{ message: string }>("/api/auth/challenge", { body: { address } });
  const signature = await eth.request({ method: "personal_sign", params: [toHex(message), address] });
  await api("/api/auth/verify", { body: { signature } });
}
