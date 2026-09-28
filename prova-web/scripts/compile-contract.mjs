// Compiles contracts/ProvaSeal.sol to contracts/ProvaSeal.json (ABI + bytecode).
// Run: node scripts/compile-contract.mjs
import fs from "fs";
import solc from "solc";

const source = fs.readFileSync("contracts/ProvaSeal.sol", "utf8");
const input = {
  language: "Solidity",
  sources: { "ProvaSeal.sol": { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error(errors.map((e) => e.formattedMessage).join("\n"));
  process.exit(1);
}
const c = out.contracts["ProvaSeal.sol"].ProvaSeal;
fs.writeFileSync("contracts/ProvaSeal.json", JSON.stringify({ compiler: solc.version(), abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2) + "\n");
console.log("Compiled ProvaSeal with solc", solc.version());
