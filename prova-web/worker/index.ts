// Prova background worker (run with PM2 next to the website):
//  - seals new claims onchain in batches
//  - grades claims once their deadline passes, then records the result onchain
//  - sends Telegram alerts and links Telegram accounts
import "dotenv/config";
import { BaseError, ContractFunctionRevertedError, parseEventLogs } from "viem";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publicClient, SEAL_ABI, sealerClient, sealingEnabled } from "@/lib/server/chain";
import { ENV } from "@/lib/server/env";
import { grade, measure } from "@/lib/server/grading";
import { escapeHtml, sendTelegram, telegramEnabled, tg } from "@/lib/server/telegram";
import { tokenMarket } from "@/lib/server/tools/dexscreener";
import { deliverWebhook } from "@/lib/server/webhooks";
import { toCallView } from "@/lib/server/views";
import { indexPayments, moneyEnabled, refreshMarkets, registerAgents, registerTokens, runBuybacks } from "./money";

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const RESULT = { hit: 1, miss: 2, void: 3 } as const;

async function sendTx(functionName: "sealBatch" | "recordGrades", args: readonly unknown[]) {
  const wallet = sealerClient()!;
  const { request } = await publicClient().simulateContract({ address: ENV.sealContract as `0x${string}`, abi: SEAL_ABI, functionName, args, account: wallet.account });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient().waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error(`${functionName} tx reverted: ${hash}`);
  return receipt;
}

// Onchain state of a hash: [sealedAt, gradesAt, gradedAt, result, agentId]
const onchainSeal = (hash: `0x${string}`) =>
  publicClient().readContract({ address: ENV.sealContract as `0x${string}`, abi: SEAL_ABI, functionName: "seals", args: [hash] }) as Promise<readonly [bigint, bigint, bigint, number, bigint]>;

async function sealPending() {
  if (!sealingEnabled()) return;
  const calls = await prisma.call.findMany({
    where: { claimHash: { not: null }, sealTx: null, status: "open" },
    include: { agent: { select: { seq: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  if (!calls.length) return;

  // Skip anything already on chain (e.g. a previous run died before saving).
  const todo = [];
  for (const c of calls) {
    const s = await onchainSeal(c.claimHash as `0x${string}`);
    if (s[0] > 0n) await prisma.call.update({ where: { id: c.id }, data: { sealTx: "onchain", sealedAt: new Date(Number(s[0]) * 1000) } });
    else todo.push(c);
  }
  if (!todo.length) return;

  const receipt = await sendTx("sealBatch", [
    todo.map((c) => c.claimHash as `0x${string}`),
    todo.map((c) => BigInt(c.agent.seq)),
    todo.map((c) => BigInt(Math.floor(c.gradesAt!.getTime() / 1000))),
  ]);
  const block = await publicClient().getBlock({ blockNumber: receipt.blockNumber });
  const sealedAt = new Date(Number(block.timestamp) * 1000);
  const sealed = parseEventLogs({ abi: SEAL_ABI, logs: receipt.logs, eventName: "Sealed" }).map((l: any) => (l.args.hash as string).toLowerCase());
  await prisma.call.updateMany({ where: { claimHash: { in: sealed } }, data: { sealTx: receipt.transactionHash, sealedAt } });
  log(`sealed ${sealed.length} call(s) in ${receipt.transactionHash}`);
}

async function gradeDue() {
  const due = await prisma.call.findMany({ where: { status: "open", gradesAt: { lte: new Date() } }, orderBy: { gradesAt: "asc" }, take: 50 });
  for (const c of due) {
    // Only calls sealed before their deadline count. Anything else is void.
    if (!c.sealedAt || c.sealedAt >= c.gradesAt!) {
      if (sealingEnabled() && Date.now() - c.gradesAt!.getTime() < 3600_000) continue; // give a late seal an hour
      await prisma.call.update({ where: { id: c.id }, data: { status: "void", gradedAt: new Date(), outcomeJson: JSON.stringify({ reason: "not sealed before the deadline" }) } });
      log(`voided ${c.id} (not sealed in time)`);
      continue;
    }
    let exit;
    try {
      exit = await tokenMarket(c.subject!, 0);
    } catch (err) {
      log(`price lookup failed for ${c.id}, retrying later:`, (err as Error).message);
      continue;
    }
    const entry = JSON.parse(c.entryJson!);
    const claim = JSON.parse(c.claimJson!);
    const outcome = measure(entry, exit);
    const result = grade(claim, outcome);
    await prisma.call.update({ where: { id: c.id }, data: { status: result, gradedAt: new Date(), outcomeJson: JSON.stringify(outcome) } });
    log(`graded ${c.id}: ${result} (price ${outcome.priceChangePct}%)`);
  }
}

async function recordGradesOnchain() {
  if (!sealingEnabled()) return;
  const calls = await prisma.call.findMany({
    where: { status: { in: ["hit", "miss", "void"] }, gradeTx: null, sealTx: { not: null }, claimHash: { not: null } },
    orderBy: { gradedAt: "asc" },
    take: 100,
  });
  if (!calls.length) return;
  // The contract checks block time, so compare against the chain's clock.
  const chainNow = Number((await publicClient().getBlock()).timestamp);
  const todo = [];
  for (const c of calls) {
    const s = await onchainSeal(c.claimHash as `0x${string}`);
    if (s[3] !== 0) await prisma.call.update({ where: { id: c.id }, data: { gradeTx: "onchain" } });
    else if (s[0] > 0n && chainNow >= Number(s[1])) todo.push(c);
  }
  if (!todo.length) return;
  const receipt = await sendTx("recordGrades", [todo.map((c) => c.claimHash as `0x${string}`), todo.map((c) => RESULT[c.status as keyof typeof RESULT])]);
  await prisma.call.updateMany({ where: { id: { in: todo.map((c) => c.id) } }, data: { gradeTx: receipt.transactionHash } });
  log(`recorded ${todo.length} grade(s) in ${receipt.transactionHash}`);
}

async function sendAlerts() {
  if (!telegramEnabled()) return;
  const calls = await prisma.call.findMany({
    where: { alertedAt: null, claimHash: { not: null }, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    include: { agent: { include: { alerts: { include: { user: true } } } } },
    take: 50,
  });
  for (const c of calls) {
    const text = `<b>${escapeHtml(c.agent.name)}</b> made a new call\n${escapeHtml(c.claimLabel || "")} · ${escapeHtml(c.subject || "")}\n\n${escapeHtml(c.output.slice(0, 400))}\n\n${ENV.siteUrl}/agents/${c.agent.slug}`;
    for (const a of c.agent.alerts) {
      if (!a.user.telegramChatId) continue;
      try {
        await sendTelegram(a.user.telegramChatId, text);
      } catch (err) {
        log("telegram send failed:", (err as Error).message);
      }
    }
    await prisma.call.update({ where: { id: c.id }, data: { alertedAt: new Date() } });
  }
}

// Links a Telegram chat to a wallet when the user opens t.me/<bot>?start=<code>.
async function telegramUpdates() {
  if (!telegramEnabled()) return;
  const kv = await prisma.keyValue.findUnique({ where: { key: "telegram_offset" } });
  const updates: any[] = await tg("getUpdates", { offset: kv ? +kv.value : 0, timeout: 0, allowed_updates: ["message"] });
  for (const u of updates) {
    const msg = u.message;
    const text: string = msg?.text || "";
    const chatId = String(msg?.chat?.id || "");
    try {
      if (text.startsWith("/start ")) {
        const code = text.slice(7).trim();
        const user = code ? await prisma.user.findUnique({ where: { telegramLinkCode: code } }) : null;
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: chatId, telegramLinkCode: null } });
          await sendTelegram(chatId, "Linked to your Prova wallet. You'll get a message for every new call from agents you turn alerts on for.");
        } else await sendTelegram(chatId, "That link has expired. Open Prova, turn on an alert and try again.");
      } else if (text === "/stop") {
        await prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
        await sendTelegram(chatId, "Alerts stopped. Turn them on again from any agent on Prova.");
      } else if (text === "/start") {
        await sendTelegram(chatId, `Open ${ENV.siteUrl}, sign in with your wallet and turn on alerts for an agent to link this chat.`);
      }
    } catch (err) {
      log("telegram update failed:", (err as Error).message);
    }
    await prisma.keyValue.upsert({ where: { key: "telegram_offset" }, update: { value: String(u.update_id + 1) }, create: { key: "telegram_offset", value: String(u.update_id + 1) } });
  }
}

// Webhooks: every sealed and every graded call of an agent is POSTed to the
// webhooks of wallets that have that agent on their watchlist.
async function sendWebhooks() {
  const kinds: { field: "hookSealAt" | "hookGradeAt"; type: string; where: Prisma.CallWhereInput }[] = [
    { field: "hookSealAt", type: "call.sealed", where: { sealTx: { not: null }, hookSealAt: null } },
    { field: "hookGradeAt", type: "call.graded", where: { status: { in: ["hit", "miss", "void"] }, hookGradeAt: null } },
  ];
  for (const { field, type, where } of kinds) {
    const calls = await prisma.call.findMany({
      where: { ...where, createdAt: { gte: new Date(Date.now() - 8 * 86400_000) } },
      include: { agent: { include: { watches: { include: { user: { include: { webhooks: { where: { disabled: false } } } } } } } } },
      take: 50,
    });
    for (const c of calls) {
      const v = toCallView(c);
      const event = { type, created: new Date().toISOString(), data: { agent: c.agent.slug, call: { id: v.id, verdict: v.label, token: v.subject, status: v.status, seal: v.claimHash, seal_tx: v.sealTx, grades_at: v.gradesAt, graded_at: v.gradedAt, price_change_pct: v.priceChangePct, answer: v.output } } };
      for (const hook of c.agent.watches.flatMap((w) => w.user.webhooks)) {
        try {
          await deliverWebhook(hook.url, hook.secret, event);
          await prisma.webhook.update({ where: { id: hook.id }, data: { failures: 0, lastError: null, lastOkAt: new Date() } });
        } catch (err) {
          const failures = hook.failures + 1;
          await prisma.webhook.update({ where: { id: hook.id }, data: { failures, lastError: (err as Error).message.slice(0, 200), disabled: failures >= 20 } });
        }
      }
      await prisma.call.update({ where: { id: c.id }, data: { [field]: new Date() } });
    }
  }
}

// Runs a job every `ms`, never overlapping with itself.
function every(name: string, ms: number, job: () => Promise<void>) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await job();
    } catch (err) {
      const msg = err instanceof BaseError
        ? (err.walk((e) => e instanceof ContractFunctionRevertedError) as Error | null)?.message || `${err.shortMessage} ${err.details || ""}`.trim()
        : (err as Error).message;
      log(`${name} failed:`, msg);
    } finally {
      busy = false;
    }
  };
  tick();
  setInterval(tick, ms);
}

log(`Prova worker started. Sealing ${sealingEnabled() ? "on (" + ENV.chain + ")" : "OFF: set SEALER_PRIVATE_KEY and SEAL_CONTRACT"}. Telegram ${telegramEnabled() ? "on" : "off"}. Payments ${moneyEnabled() ? "on" : "OFF: set RUNS_CONTRACT"}. Buybacks ${moneyEnabled() && ENV.swapRouter ? "on" : "off"}.`);
every("seal", 20_000, sealPending);
every("grade", 60_000, async () => {
  await gradeDue();
  await recordGradesOnchain();
});
every("alerts", 20_000, sendAlerts);
every("telegram", 5_000, telegramUpdates);
every("webhooks", 15_000, sendWebhooks);
every("payments", 15_000, async () => {
  await registerAgents();
  await registerTokens();
  await indexPayments();
});
every("buybacks", ENV.buybackEveryMinutes * 60_000, runBuybacks);
every("markets", 5 * 60_000, refreshMarkets);
