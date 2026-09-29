"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/config/site";
import { shortAddr } from "@/lib/format";
import { SearchIcon, XIcon } from "./icons";
import MobileMenu from "./MobileMenu";
import { useUI } from "./UIProvider";

export default function Nav() {
  const { me, connect, openPalette } = useUI();
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav id="nav" className={solid ? "solid" : ""}>
        <div className="wrap">
          <a href="/" className="logo" aria-label="Veraim home"><span className="mark" />Veraim</a>
          <div className="links">
            <a href="/#agents">Agents</a><a href="/#tokens">Tokens</a><a href="/#live">Live</a><a href="/#compare">Compare</a><a href="/#earn">Earn</a><a href="/#api">API</a>
          </div>
          <div className="nr">
            <button className="kbtn" id="kbtn" aria-label="Search" onClick={openPalette}>
              <SearchIcon /><span className="kt">Search agents</span><kbd>⌘K</kbd>
            </button>
            <a href={SITE.xUrl} target="_blank" rel="noopener" className="xbtn nav-x" aria-label="Veraim on X"><XIcon /></a>
            {me ? (
              <a href="/account" className="btn btn-g" id="wallet" style={{ fontFamily: "var(--m)", fontSize: 13 }}>{shortAddr(me.wallet)}</a>
            ) : (
              <>
                <a href="#" className="signin" onClick={(e) => { e.preventDefault(); connect(); }}>Sign in</a>
                <button className="btn btn-w" id="wallet" onClick={() => connect()}>Connect wallet</button>
              </>
            )}
            <button className="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 8h16M4 16h16" /></svg>
            </button>
          </div>
        </div>
      </nav>
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
