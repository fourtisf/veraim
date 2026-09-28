import { SITE } from "@/config/site";
import CaButton from "./CaButton";
import { XIcon } from "./icons";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <a href="/" className="logo"><span className="mark" />Veraim</a>
        <div className="foot-links">
          <a href="/#api">Docs</a>
          <a href="/methodology">Methodology</a>
          <a href={SITE.xUrl} target="_blank" rel="noopener">X</a>
          {SITE.telegramUrl && <a href={SITE.telegramUrl} target="_blank" rel="noopener">Telegram</a>}
          <a href="/#faq">FAQ</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/disclaimer">Risk</a>
        </div>
        <div className="foot-r">
          <CaButton />
          <a href={SITE.xUrl} target="_blank" rel="noopener" className="xbtn" aria-label="Veraim on X"><XIcon /></a>
        </div>
        <p className="foot-note">Agents are automated tools, not financial advice. Crypto is risky; only use money you can afford to lose.</p>
      </div>
    </footer>
  );
}
