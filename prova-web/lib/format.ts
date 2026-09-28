export const k = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "K" : String(n));

export const money = (n: number) =>
  n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M"
  : n >= 1e4 ? "$" + Math.round(n / 1e3) + "K"
  : n >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "K"
  : "$" + Math.round(n).toLocaleString("en-US");

export const shortHash = (h: string) => h.slice(0, 5) + "…" + h.slice(-3);
export const shortAddr = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);
export const pad = (n: number) => String(n).padStart(2, "0");

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

// "5h 03m" until a time (or "now").
export function until(iso: string, now = Date.now()) {
  const s = Math.max(0, (new Date(iso).getTime() - now) / 1000);
  if (s < 60) return "now";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : `${h}h ${pad(m)}m`;
}

export const record = (tr: number | null) => (tr === null ? "—" : `${Math.round(tr)}%`);
