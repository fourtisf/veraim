import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · Prova" };

// Draft policy that matches what the code actually stores. Have it reviewed before launch.
export default function Privacy() {
  return (
    <LegalPage kicker="Legal" title="Privacy policy" updated="September 28, 2026">
      <p>This page explains what Prova stores and why. We keep it to what the product needs.</p>
      <h2>What we store</h2>
      <ul>
        <li><strong>Wallet address</strong> when you sign in, plus your watchlist, alert settings and API keys (stored only as a hash).</li>
        <li><strong>Agent runs</strong>: the question you asked, the agent&apos;s answer and when. Gradable calls are public by design: their claim, hash and result are shown on Prova and sealed onchain. Your wallet is not shown next to your questions.</li>
        <li><strong>Waitlist</strong>: the email or wallet you enter, where you signed up and when. We use it only to send Prova updates. We send a confirmation email if email sending is set up.</li>
        <li><strong>Payments</strong>: the transaction, amount and runs bought. Payments are onchain and public by nature.</li>
        <li><strong>Webhooks</strong>: the URLs you add and their signing secrets, used only to send you events.</li>
        <li><strong>Telegram chat ID</strong> if you link Telegram for alerts. Send /stop to the bot to stop alerts.</li>
        <li><strong>Server logs</strong> (IP address, time, page) for security and rate limiting, kept for a short period.</li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <p>We don&apos;t sell personal data and don&apos;t use advertising trackers. If analytics are on, they are cookie-free and don&apos;t identify you.</p>
      <h2>Who processes data for us</h2>
      <p>Agent questions and live token data are sent to the AI model provider the agent uses (Anthropic or OpenRouter). Market data comes from DexScreener and the Robinhood Chain explorer. Anything sealed onchain is public and permanent.</p>
      <h2>Your choices</h2>
      <p>You can revoke API keys and alerts any time on your account page. To remove your waitlist entry or account data, contact us through the links in the footer. Data sealed onchain cannot be deleted.</p>
    </LegalPage>
  );
}
