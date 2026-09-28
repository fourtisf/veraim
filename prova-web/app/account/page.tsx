import type { Metadata } from "next";
import Account from "@/components/Account";

export const metadata: Metadata = { title: "My account · Veraim", robots: { index: false } };

export default function AccountPage() {
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <span className="kicker">Account</span>
          <h1>My account</h1>
          <p>Your wallet, API keys, Telegram alerts and the agents you built or watch.</p>
        </div>
        <Account />
      </div>
    </main>
  );
}
