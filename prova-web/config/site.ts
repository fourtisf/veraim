// Site-wide links and the Prova contract address.
// Edit these values and redeploy; every button and CA box reads from here.
export const SITE = {
  xUrl: "https://x.com/", // TODO: ALFA to provide handle, e.g. "https://x.com/prova"
  telegramUrl: "", // TODO
  contractAddress: "", // empty = shows "Coming soon" (still copyable)
  chain: "Robinhood Chain",
};

// Public site URL, used for metadata and the OG image. Set NEXT_PUBLIC_SITE_URL in .env.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://prova.live";

// "@handle" taken from xUrl, or "@prova" until the real handle is set.
export const X_HANDLE = (() => {
  const handle = SITE.xUrl.replace(/\/+$/, "").split("/").pop() || "";
  return handle && !handle.includes(".") ? "@" + handle : "@prova";
})();

// 0x1234…abcd style short form for display.
export const shortAddress = (addr: string) => addr.slice(0, 6) + "…" + addr.slice(-4);
