// Compiles the contracts to JSON artifacts (ABI + bytecode) next to each .sol file.
// Run: npm run contract:compile
import fs from "fs";
import solc from "solc";

const FILES = ["contracts/VeraimSeal.sol", "contracts/VeraimRuns.sol", "contracts/mocks/MockERC20.sol", "contracts/mocks/MockSwapRouter.sol"];
const input = {
  language: "Solidity",
  sources: Object.fromEntries(FILES.map((f) => [f, { content: fs.readFileSync(f, "utf8") }])),
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error(errors.map((e) => e.formattedMessage).join("\n"));
  process.exit(1);
}
for (const f of FILES) {
  for (const [name, c] of Object.entries(out.contracts[f])) {
    if (!c.evm.bytecode.object) continue; // interfaces
    const path = f.replace(/[^/]+\.sol$/, `${name}.json`);
    fs.writeFileSync(path, JSON.stringify({ compiler: solc.version(), abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2) + "\n");
    console.log("compiled", path);
  }
}
