const SPLIT = [
  ["$0.05", "Someone runs the agent", "After 5 free runs, each run is paid in ETH or USDG."],
  ["60%", "The creator gets paid", "Sent straight to the builder's wallet, every run."],
  ["30%", "The token gets bought", "Buys the agent's own token on market and burns it."],
  ["10%", "Runs the network", "Covers AI inference and live data tools."],
];

// Where every paid run goes: four split cards.
export default function EarnFlow() {
  return (
    <div className="flow">
      {SPLIT.map(([big, title, text], i) => (
        <div className="fs rv spot" key={title}>
          <span className="n">{i + 1}</span><strong>{big}</strong><b>{title}</b><p>{text}</p>
        </div>
      ))}
    </div>
  );
}
