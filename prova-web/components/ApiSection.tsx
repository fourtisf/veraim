"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { highlight } from "@/lib/highlight";
import { SITE_URL } from "@/config/site";

const BASE = `${SITE_URL}/api/v1`;

const CODE: Record<string, string> = {
  curl: `curl ${BASE}/agents/bundle-hound/run \\
  -H "Authorization: Bearer $VERAIM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Is 0x7a3...e91f bundled?"}'

# → { "verdict": "BUNDLED", "seal": "0x9c2…a41",
#     "status": "open", "grades_at": "…" }`,
  js: `const res = await fetch("${BASE}/agents/bundle-hound/run", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.VERAIM_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ input: "Is 0x7a3...e91f bundled?" }),
});

const { verdict, seal } = await res.json();
console.log(verdict, seal); // BUNDLED 0x9c2…a41`,
  py: `import os, requests

res = requests.post(
    "${BASE}/agents/bundle-hound/run",
    headers={"Authorization": f"Bearer {os.environ['VERAIM_KEY']}"},
    json={"input": "Is 0x7a3...e91f bundled?"},
).json()
print(res["verdict"], res["seal"])  # BUNDLED 0x9c2…a41`,
  mcp: `{
  "mcpServers": {
    "veraim": {
      "url": "${SITE_URL}/api/mcp",
      "headers": { "Authorization": "Bearer $VERAIM_KEY" }
    }
  }
}`,
};
const LANGS: [string, string][] = [["curl", "cURL"], ["js", "JavaScript"], ["py", "Python"], ["mcp", "MCP"]];

const FEATURES: [string, string, boolean][] = [
  ["REST API", "One endpoint per agent", true],
  ["MCP server", "Use agents inside Claude and IDEs", true],
  ["Signed webhooks", "New calls pushed to you", true],
  ["JS and Python SDKs", "Typed, tiny, ready", false],
];

export default function ApiSection() {
  const [lang, setLang] = useState("curl");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    copyText(CODE[lang]);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="api">
      <div className="wrap api">
        <div>
          <div className="head rv">
            <span className="kicker">Developers</span>
            <h2>Plug any agent into your app.</h2>
            <p>Every public agent is an API. Call it from your bot, dashboard or trading tool, and get the seal back with every answer.</p>
          </div>
          <div className="feat rv">
            {FEATURES.map(([b, s, live]) => (
              <div className="spot" key={b}><b>{b}{!live && <em className="soon">Soon</em>}</b><span>{s}</span></div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 16 }}><a href="/account" style={{ color: "var(--gold)" }}>Get an API key →</a> Connect your wallet to create one.</p>
        </div>
        <div className="code rv">
          <div className="code-h" id="langs">
            {LANGS.map(([id, label]) => (
              <button key={id} className={`lang ${lang === id ? "on" : ""}`} onClick={() => setLang(id)}>{label}</button>
            ))}
            <button className="cpy" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <pre dangerouslySetInnerHTML={{ __html: highlight(CODE[lang]) }} />
        </div>
      </div>
    </section>
  );
}
