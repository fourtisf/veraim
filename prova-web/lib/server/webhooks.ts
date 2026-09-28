import { createHmac, randomBytes } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";

// Signed webhooks. Each POST carries:
//   X-Veraim-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>" with your secret>
export const newWebhookSecret = () => "whsec_" + randomBytes(24).toString("base64url");

export function signWebhook(secret: string, body: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

function privateIp(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

// Only public https URLs: never let a webhook reach the server's own network.
export async function checkWebhookUrl(raw: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Enter a full URL, e.g. https://example.com/veraim-hook";
  }
  const allowHttp = process.env.ALLOW_HTTP_WEBHOOKS === "1";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) return "Webhook URLs must use https://";
  if (url.username || url.password) return "Remove the username/password from the URL.";
  if (process.env.ALLOW_PRIVATE_WEBHOOKS === "1") return null; // local testing only
  try {
    const host = url.hostname.replace(/^\[|\]$/g, ""); // IPv6 hosts come in brackets
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => privateIp(a.address))) return "That URL points to a private network.";
  } catch {
    return "That host can't be found.";
  }
  return null;
}

export async function deliverWebhook(url: string, secret: string, event: object) {
  const problem = await checkWebhookUrl(url);
  if (problem) throw new Error(problem);
  const body = JSON.stringify(event);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Veraim-Webhooks/1.0", "x-veraim-signature": signWebhook(secret, body) },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
}
