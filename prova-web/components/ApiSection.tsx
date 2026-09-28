"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { highlight } from "@/lib/highlight";
import { CODE, CODE_LANGS } from "@/lib/mock";

const FEATURES = [
  ["REST API", "One endpoint per agent"],
  ["MCP server", "Use agents inside Claude and IDEs"],
  ["Signed webhooks", "New calls pushed to you"],
  ["JS and Python SDKs", "Typed, tiny, ready"],
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
            {FEATURES.map(([b, s]) => <div className="spot" key={b}><b>{b}</b><span>{s}</span></div>)}
          </div>
        </div>
        <div className="code rv">
          <div className="code-h" id="langs">
            {CODE_LANGS.map(([id, label]) => (
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
