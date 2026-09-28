// Deploys ProvaSeal with SEALER_PRIVATE_KEY on CHAIN / RPC_URL and prints its address.
// Run: npx tsx scripts/deploy-contract.ts   (then put the address in .env as SEAL_CONTRACT)
import "dotenv/config";
import { createWalletClient, formatEther, http, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
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
  const hash = await wallet.deployContract({ abi: SealArtifact.abi as Abi, bytecode: SealArtifact.bytecode as `0x${string}`, chain: pub.chain });
  console.log("Deploy tx:", hash);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log("\nProvaSeal deployed at:", receipt.contractAddress);
  console.log(`Add this line to .env:\nSEAL_CONTRACT=${receipt.contractAddress}`);
}

main().catch((err) => {
  console.error(err.shortMessage || err.message);
  process.exit(1);
});
