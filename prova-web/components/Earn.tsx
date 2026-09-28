import EarnFlow from "./EarnFlow";
import EarningsCalculator from "./EarningsCalculator";

export default function Earn() {
  return (
    <section id="earn">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Earn</span>
          <h2>Usage feeds the token, not just hype.</h2>
          <p>Holders win when people actually use the agent. Here&apos;s where every paid run goes.</p>
        </div>
        <EarnFlow />
        <EarningsCalculator />
      </div>
    </section>
  );
}
