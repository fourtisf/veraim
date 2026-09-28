import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAddress, verifyMessage } from "viem";
import { prisma } from "@/lib/db";
import { ENV } from "./env";
import { publicClient } from "./chain";
import { hashApiKey } from "./apiKeys";

// Wallet sign-in: the browser signs a one-time message, we check the signature
// and keep the wallet in a signed, httpOnly cookie for 30 days.
const SESSION = "prova_session";
const CHALLENGE = "prova_challenge";
const DAY = 24 * 60 * 60;

function secret() {
  if (!ENV.sessionSecret || ENV.sessionSecret.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return ENV.sessionSecret;
}
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

function pack(obj: object) {
  const data = b64(JSON.stringify(obj));
  return `${data}.${sign(data)}`;
}
function unpack<T>(value: string | undefined): T | null {
  if (!value) return null;
  const [data, sig] = value.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const obj = JSON.parse(Buffer.from(data, "base64url").toString()) as T & { exp: number };
    return obj.exp > Date.now() / 1000 ? obj : null;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: ENV.siteUrl.startsWith("https://"),
  path: "/",
  maxAge,
});

function signInMessage(address: string, nonce: string, issuedAt: string) {
  const host = new URL(ENV.siteUrl).host;
  return `${host} wants you to sign in with your wallet:\n${address}\n\nSign in to Prova. This does not send a transaction or cost gas.\n\nURI: ${ENV.siteUrl}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

// Step 1: create the message for this address.
export function createChallenge(rawAddress: string) {
  const address = getAddress(rawAddress);
  const nonce = randomBytes(12).toString("hex");
  const issuedAt = new Date().toISOString();
  cookies().set(CHALLENGE, pack({ address, nonce, issuedAt, exp: Math.floor(Date.now() / 1000) + 600 }), cookieOpts(600));
  return signInMessage(address, nonce, issuedAt);
}

// Step 2: check the signature and start the session.
export async function completeChallenge(signature: `0x${string}`) {
  const ch = unpack<{ address: `0x${string}`; nonce: string; issuedAt: string }>(cookies().get(CHALLENGE)?.value);
  if (!ch) return null;
  const message = signInMessage(ch.address, ch.nonce, ch.issuedAt);
  let ok = false;
  try {
    ok = await verifyMessage({ address: ch.address, message, signature });
  } catch {}
  if (!ok) {
    // Smart-contract wallets (ERC-1271) need the chain to verify.
    try {
      ok = await publicClient().verifyMessage({ address: ch.address, message, signature });
    } catch {}
  }
  cookies().delete(CHALLENGE);
  if (!ok) return null;
  const wallet = ch.address.toLowerCase();
  const user = await prisma.user.upsert({ where: { wallet }, update: {}, create: { wallet } });
  cookies().set(SESSION, pack({ uid: user.id, w: wallet, exp: Math.floor(Date.now() / 1000) + 30 * DAY }), cookieOpts(30 * DAY));
  return user;
}

export function endSession() {
  cookies().delete(SESSION);
}

// The signed-in user for this request (cookie), or null.
export async function currentUser() {
  const s = unpack<{ uid: string }>(cookies().get(SESSION)?.value);
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.uid } });
}

// For the public API: "Authorization: Bearer prova_…".
export async function apiKeyUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !token.startsWith("prova_")) return null;
  const key = await prisma.apiKey.findUnique({ where: { hash: hashApiKey(token) }, include: { user: true } });
  if (!key || key.revokedAt) return null;
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return key.user;
}

export const isAdmin = (wallet: string | undefined | null) => !!wallet && ENV.adminWallets.includes(wallet.toLowerCase());
