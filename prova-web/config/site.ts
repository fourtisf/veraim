// Site-wide links and the Veraim contract address.
// Edit these values and redeploy; every button and CA box reads from here.
export const SITE = {
  xUrl: "https://x.com/Veraimxyz",
  telegramUrl: "", // TODO
  contractAddress: "0xbA5d208f5D42EC6d2aAaC444151C68E59c0f634b", // empty = shows "Coming soon" (still copyable)
  chain: "Robinhood Chain",
  launchDate: "", // e.g. "October 15, 2026" — shown in the waitlist when set
  launchpadUrl: "", // where creators launch agent tokens, e.g. Robinfun's URL
};

// Public site URL, used for metadata and the OG image. Set NEXT_PUBLIC_SITE_URL in .env.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://veraim.xyz";

// "@handle" taken from xUrl.
export const X_HANDLE = (() => {
  const handle = SITE.xUrl.replace(/\/+$/, "").split("/").pop() || "";
  return handle && !handle.includes(".") ? "@" + handle : "@veraim";
})();

// 0x1234…abcd style short form for display.
export const shortAddress = (addr: string) => addr.slice(0, 6) + "…" + addr.slice(-4);
