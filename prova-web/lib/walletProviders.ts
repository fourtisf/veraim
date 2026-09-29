// Finds the wallets in this browser (EIP-6963, with a window.ethereum fallback) and remembers
// which one the user picked, so sign-in and payments go to the same wallet.
export type Eip1193 = {
  request: (a: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (event: string, fn: (...args: any[]) => void) => void;
  removeListener?: (event: string, fn: (...args: any[]) => void) => void;
};
export type WalletOption = { id: string; name: string; icon: string; provider: Eip1193 };

// Wallets we show even when they aren't installed: a link opens Veraim inside the wallet app
// on phones, or the install page on desktop.
export type KnownWallet = { id: string; name: string; icon: string; install: string; open?: (url: string) => string };
const enc = encodeURIComponent;
export const KNOWN_WALLETS: KnownWallet[] = [
  { id: "io.metamask", name: "MetaMask", icon: "/wallets/metamask.svg", install: "https://metamask.io/download/", open: (u) => `https://metamask.app.link/dapp/${u.replace(/^https?:\/\//, "")}` },
  { id: "com.coinbase.wallet", name: "Coinbase Wallet", icon: "/wallets/coinbase.svg", install: "https://www.coinbase.com/wallet/downloads", open: (u) => `https://go.cb-w.com/dapp?cb_url=${enc(u)}` },
  { id: "com.trustwallet.app", name: "Trust Wallet", icon: "/wallets/trust.svg", install: "https://trustwallet.com/download", open: (u) => `https://link.trustwallet.com/open_url?coin_id=60&url=${enc(u)}` },
  { id: "com.okex.wallet", name: "OKX Wallet", icon: "/wallets/okx.svg", install: "https://www.okx.com/web3", open: (u) => `okx://wallet/dapp/url?dappUrl=${enc(u)}` },
  { id: "app.phantom", name: "Phantom", icon: "/wallets/phantom.svg", install: "https://phantom.com/download", open: (u) => `https://phantom.app/ul/browse/${enc(u)}?ref=${enc(new URL(u).origin)}` },
  { id: "io.rabby", name: "Rabby", icon: "/wallets/rabby.svg", install: "https://rabby.io/" },
  { id: "me.rainbow", name: "Rainbow", icon: "/wallets/rainbow.svg", install: "https://rainbow.me/download" },
  { id: "io.zerion.wallet", name: "Zerion", icon: "/wallets/zerion.svg", install: "https://zerion.io/download" },
];
export const GENERIC_ICON = "/wallets/wallet-connect.svg";

const found = new Map<string, WalletOption>();
const subscribers = new Set<() => void>();
let started = false;

export function startDiscovery() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("eip6963:announceProvider", (e: Event) => {
    const { info, provider } = (e as CustomEvent).detail || {};
    if (!info || !provider) return;
    const id = info.rdns || info.uuid;
    if (found.has(id)) return;
    found.set(id, { id, name: info.name, icon: info.icon, provider });
    subscribers.forEach((fn) => fn());
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function onWalletsChanged(fn: () => void) {
  subscribers.add(fn);
  return () => void subscribers.delete(fn);
}

// Wallets in this browser. Older wallets that only set window.ethereum show up as one entry.
export function installedWallets(): WalletOption[] {
  const list = [...found.values()];
  if (list.length || typeof window === "undefined") return list;
  const e = (window as any).ethereum;
  if (!e) return [];
  const known = (id: string) => KNOWN_WALLETS.find((w) => w.id === id)!;
  const guess =
    (e.isRabby && known("io.rabby")) || (e.isCoinbaseWallet && known("com.coinbase.wallet")) || ((e.isTrust || e.isTrustWallet) && known("com.trustwallet.app")) ||
    ((e.isOkxWallet || e.isOKExWallet) && known("com.okex.wallet")) || (e.isPhantom && known("app.phantom")) || (e.isRainbow && known("me.rainbow")) ||
    (e.isZerion && known("io.zerion.wallet")) || (e.isMetaMask && known("io.metamask"));
  return [{ id: guess ? guess.id : "injected", name: guess ? guess.name : "Browser wallet", icon: guess ? guess.icon : GENERIC_ICON, provider: e }];
}

const KEY = "veraim_wallet";
let active: Eip1193 | null = null;

export function setActiveWallet(w: WalletOption) {
  active = w.provider;
  try { localStorage.setItem(KEY, w.id); } catch {}
}

export function clearActiveWallet() {
  active = null;
  try { localStorage.removeItem(KEY); } catch {}
}

// The wallet the user signed in with (after a reload: the same one, found again by id).
export function activeProvider(): Eip1193 | null {
  if (active) return active;
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const all = installedWallets();
  const pick = (saved && all.find((w) => w.id === saved)) || all[0];
  return pick ? (active = pick.provider) : null;
}

export const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
