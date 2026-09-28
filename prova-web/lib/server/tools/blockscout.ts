import { ENV } from "../env";
import { getJson } from "./http";

// Blockscout REST API v2 (the Robinhood Chain explorer).
const api = (path: string) => `${ENV.blockscoutApi}${path}`;

export type Holder = { address: string; share: number; isContract: boolean };

export async function tokenInfo(token: string) {
  const t = await getJson<any>(api(`/tokens/${token}`), { ttlMs: 300_000 });
  return {
    name: t.name as string,
    symbol: t.symbol as string,
    decimals: +t.decimals || 18,
    totalSupply: t.total_supply ? BigInt(t.total_supply) : 0n,
    holders: +(t.holders_count ?? t.holders ?? 0),
  };
}

export async function topHolders(token: string, limit = 20): Promise<Holder[]> {
  const [info, page] = await Promise.all([tokenInfo(token), getJson<any>(api(`/tokens/${token}/holders`), { ttlMs: 120_000 })]);
  const supply = Number(info.totalSupply) || 1;
  return (page.items || []).slice(0, limit).map((h: any) => ({
    address: (h.address?.hash || "").toLowerCase(),
    share: Number(h.value) / supply,
    isContract: !!h.address?.is_contract,
  }));
}

export async function addressInfo(address: string) {
  const a = await getJson<any>(api(`/addresses/${address}`), { ttlMs: 300_000 });
  return {
    isContract: !!a.is_contract,
    creator: (a.creator_address_hash || "").toLowerCase() || null,
    creationTx: a.creation_tx_hash || a.creation_transaction_hash || null,
  };
}

export type Transfer = { from: string; to: string; amount: number; block: number; timestamp: string; tx: string };

// Token transfers, newest first. Walks up to `pages` pages.
export async function tokenTransfers(token: string, pages = 3): Promise<Transfer[]> {
  const out: Transfer[] = [];
  let params = "";
  for (let i = 0; i < pages; i++) {
    const page = await getJson<any>(api(`/tokens/${token}/transfers${params}`), { ttlMs: 60_000 });
    for (const t of page.items || []) {
      const decimals = +(t.total?.decimals ?? t.token?.decimals ?? 18);
      out.push({
        from: (t.from?.hash || "").toLowerCase(),
        to: (t.to?.hash || "").toLowerCase(),
        amount: Number(t.total?.value || 0) / 10 ** decimals,
        block: +(t.block_number ?? t.block ?? 0),
        timestamp: t.timestamp,
        tx: t.transaction_hash || t.tx_hash,
      });
    }
    if (!page.next_page_params) break;
    params = "?" + new URLSearchParams(Object.entries(page.next_page_params).map(([k, v]) => [k, String(v)])).toString();
  }
  return out;
}

export type Tx = { hash: string; from: string; to: string | null; created: string | null; value: number; timestamp: string };

export async function addressTxs(address: string): Promise<Tx[]> {
  const page = await getJson<any>(api(`/addresses/${address}/transactions`), { ttlMs: 120_000 });
  return (page.items || []).map((t: any) => ({
    hash: t.hash,
    from: (t.from?.hash || "").toLowerCase(),
    to: t.to?.hash?.toLowerCase() || null,
    created: t.created_contract?.hash?.toLowerCase() || null,
    value: Number(t.value || 0) / 1e18,
    timestamp: t.timestamp,
  }));
}
