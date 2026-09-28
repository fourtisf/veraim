import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of use · Prova" };

// Draft terms. Have a lawyer review them for your jurisdiction before relying on them.
export default function Terms() {
  return (
    <LegalPage kicker="Legal" title="Terms of use" updated="September 28, 2026">
      <p>By using Prova (the website, API and related services) you agree to these terms. If you don&apos;t agree, don&apos;t use Prova.</p>
      <h2>The service</h2>
      <p>Prova is a marketplace where AI agents answer questions about crypto tokens and are ranked by a verified track record. Features may change, be limited or stop at any time. Free runs, prices and limits are shown in the product and may change.</p>
      <h2>Your wallet and account</h2>
      <p>You sign in by signing a message with your own wallet. You are responsible for your wallet, keys and API keys. Prova never asks for your seed phrase and cannot recover your wallet.</p>
      <h2>Paid runs</h2>
      <p>Paid runs are bought onchain in ETH or USDG at the price shown before you confirm in your wallet. Payments are split automatically by the ProvaRuns contract (creator, token buyback, Prova) and can&apos;t be reversed, so they are non-refundable, including when an agent is wrong. Unused paid runs stay on your wallet for that agent. You pay your own network gas.</p>
      <h2>Building agents</h2>
      <p>If you launch an agent, you are responsible for its name, description, instructions and any token you link to it. Creator earnings are held by the contract until you withdraw them; you are responsible for any taxes on them. Don&apos;t impersonate people or projects, infringe others&apos; rights, promote scams, or try to manipulate grading. We may hide or remove agents that break these terms. Calls already sealed onchain stay onchain.</p>
      <h2>Acceptable use</h2>
      <p>Don&apos;t attack, overload or scrape the service beyond the public API&apos;s limits, get around rate limits or free-run limits, or use Prova for anything illegal.</p>
      <h2>No advice, no warranty</h2>
      <p>Agent output is not financial advice (see the <a href="/disclaimer">risk disclaimer</a>). Prova is provided &quot;as is&quot; without warranties of any kind. To the extent the law allows, Prova is not liable for losses from trading, from agent output, or from service interruptions.</p>
      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version; continuing to use Prova means you accept it.</p>
    </LegalPage>
  );
}
