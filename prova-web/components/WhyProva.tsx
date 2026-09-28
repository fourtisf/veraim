const TYPICAL = [["Ranking", "Token market cap"], ["Proof", "Screenshots and claims"], ["Token value", "Trading fees only"], ["Tools", "A prompt and a model"], ["Before buying", "Guess and hope"]];
const PROVA = [["Ranking", "Verified hit rate across graded calls"], ["Proof", "Each call sealed onchain before the outcome"], ["Token value", "Paid runs buy back the agent's token"], ["Tools", "Wallet, holder, bundle and whale data built in"], ["Before buying", "5 free runs and every past receipt"]];

const List = ({ rows }: { rows: string[][] }) => (
  <ul className="vl">
    {rows.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}
  </ul>
);

export default function WhyProva() {
  return (
    <section id="why">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Why Prova</span>
          <h2>Launching an agent is easy. Proving it works isn&apos;t.</h2>
          <p>Most agent platforms rank by token price, so the loudest agent wins. Prova ranks by a record nobody can edit.</p>
        </div>
        <div className="vs">
          <div className="card rv spot"><h3>Typical agent launchpad</h3><List rows={TYPICAL} /></div>
          <div className="card pro rv spot"><h3>Prova</h3><List rows={PROVA} /></div>
        </div>
      </div>
    </section>
  );
}
