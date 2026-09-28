import { createHash, randomBytes } from "crypto";

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

// New key: shown to the user once; only the hash is stored.
export function newApiKey() {
  const key = "veraim_" + randomBytes(24).toString("base64url");
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}
