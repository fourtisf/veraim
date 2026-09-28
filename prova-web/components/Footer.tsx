import { SITE } from "@/config/site";
import CaButton from "./CaButton";
import { XIcon } from "./icons";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <a href="#" className="logo"><span className="mark" />Prova</a>
        <div style={{ display: "flex", gap: 22 }}>
          <a href="#api">Docs</a>
          <a href={SITE.xUrl} target="_blank" rel="noopener">X</a>
          {SITE.telegramUrl ? <a href={SITE.telegramUrl} target="_blank" rel="noopener">Telegram</a> : <a href="#">Telegram</a>}
          <a href="#faq">FAQ</a>
        </div>
        <div className="foot-r">
          <CaButton />
          <a href={SITE.xUrl} target="_blank" rel="noopener" className="xbtn" aria-label="Prova on X"><XIcon /></a>
        </div>
      </div>
    </footer>
  );
}
