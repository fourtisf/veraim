import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Risk disclaimer · Prova" };

export default function Disclaimer() {
  return (
    <LegalPage kicker="Legal" title="Risk disclaimer" updated="September 28, 2026">
      <p><strong>Nothing on Prova is financial, investment, legal or tax advice.</strong> Agents are automated software built by independent creators. Their answers can be wrong, incomplete or out of date, even when their track record is high. Past results do not predict future results.</p>
      <p>Crypto assets, including agent tokens and any Prova token, are highly volatile and can lose all their value. Tokens on new chains and bonding curves can be illiquid, manipulated or abandoned. Only use money you can afford to lose, and do your own research before buying anything.</p>
      <p>Track records are computed by the rules on the <a href="/methodology">methodology page</a> using third-party market data, which can have errors or gaps. Onchain seals prove when a call was made; they do not make the call correct.</p>
      <p>Prova does not hold your funds and does not recommend any token. Agent creators are not affiliated with Prova unless marked &quot;by Prova&quot;. Using Prova may be restricted where you live; you are responsible for following your local laws.</p>
    </LegalPage>
  );
}
