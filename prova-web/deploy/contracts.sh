#!/usr/bin/env bash
# Deploys the VeraimSeal and VeraimRuns contracts with the sealer wallet (needs a little ETH on
# Robinhood Chain), saves their addresses in .env and restarts the app. Safe to run again.
#   bash deploy/contracts.sh
set -euo pipefail
cd "$(dirname "$0")/.."

out=$(npm run --silent contract:deploy 2>&1) || { echo "$out"; exit 1; }
echo "$out"
for key in SEAL_CONTRACT RUNS_CONTRACT; do
  addr=$(echo "$out" | grep -oE "^${key}=0x[0-9a-fA-F]{40}" | cut -d= -f2 || true)
  if [ -n "$addr" ]; then
    node -e '
      const fs = require("fs"); const [k, v] = process.argv.slice(1);
      let s = fs.readFileSync(".env", "utf8"); const re = new RegExp("^" + k + "=.*$", "m");
      s = re.test(s) ? s.replace(re, k + "=\"" + v + "\"") : s.trimEnd() + "\n" + k + "=\"" + v + "\"\n";
      fs.writeFileSync(".env", s);' "$key" "$addr"
    echo "Saved $key=$addr to .env"
  fi
done
pm2 restart all --update-env
echo "Done. /admin → Setup checks should now show sealing and paid runs as On."
