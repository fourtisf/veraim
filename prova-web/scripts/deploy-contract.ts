// Deploys the Prova contracts with SEALER_PRIVATE_KEY on CHAIN / RPC_URL:
//   ProvaSeal (call seals + grades)   -> SEAL_CONTRACT
//   ProvaRuns (paid runs + buybacks)  -> RUNS_CONTRACT
// Skips any contract already set in .env. Run: npm run contract:deploy
import "dotenv/config";
import { createWalletClient, formatEther, http, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import RunsArtifact from "../contracts/ProvaRuns.json";
import SealArtifact from "../contracts/ProvaSeal.json";
import { publicClient } from "../lib/server/chain";
import { ENV } from "../lib/server/env";

async function main() {
  if (!ENV.sealerKey) throw new Error("Set SEALER_PRIVATE_KEY in .env first.");
  const account = privateKeyToAccount(ENV.sealerKey);
  const pub = publicClient();
  const balance = await pub.getBalance({ address: account.address });
  console.log(`Deployer ${account.address} on chain ${pub.chain!.id} has ${formatEther(balance)} ETH`);
  if (balance === 0n) throw new Error("This wallet has no ETH for gas. Send it a little ETH first.");
  const wallet = createWalletClient({ account, chain: pub.chain, transport: http(ENV.rpcUrl || undefined) });

  const deploy = async (name: string, artifact: { abi: unknown; bytecode: string }, args: unknown[] = []) => {
    const hash = await wallet.deployContract({ abi: artifact.abi as Abi, bytecode: artifact.bytecode as `0x${string}`, args, chain: pub.chain });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    console.log(`${name} deployed at ${receipt.contractAddress}`);
    return receipt.contractAddress!;
  };

  const lines: string[] = [];
  if (!ENV.sealContract) lines.push(`SEAL_CONTRACT=${await deploy("ProvaSeal", SealArtifact)}`);
  else console.log("ProvaSeal already set:", ENV.sealContract);

  let runs = ENV.runsContract;
  if (!runs) {
    const treasury = ENV.treasury || account.address;
    runs = (await deploy("ProvaRuns", RunsArtifact, [treasury, ENV.usdg])) as `0x${string}`;
    console.log(`  treasury ${treasury}, USDG ${ENV.usdg}`);
    lines.push(`RUNS_CONTRACT=${runs}`);
  } else console.log("ProvaRuns already set:", runs);

  // Allow the DEX router used for buybacks (safe to run again).
  if (ENV.swapRouter) {
    const allowed = await pub.readContract({ address: runs, abi: RunsArtifact.abi as Abi, functionName: "routers", args: [ENV.swapRouter] });
    if (!allowed) {
      const hash = await wallet.writeContract({ address: runs, abi: RunsArtifact.abi as Abi, functionName: "setRouter", args: [ENV.swapRouter, true], chain: pub.chain });
      await pub.waitForTransactionReceipt({ hash });
      console.log("Buyback router allowed:", ENV.swapRouter);
    }
  }

  if (lines.length) console.log(`\nAdd these lines to .env:\n${lines.join("\n")}`);
}

main().catch((err) => {
  console.error(err.shortMessage || err.message);
  process.exit(1);
});
