// The question asked about a token: used by the one-click token picks and by the autopilot,
// so both ask for a call the agent's grading mode can grade (a verdict, or a 7-day direction).
export function questionFor(agent: { category: string; gradingMode: string }, t: { address: string; symbol: string }) {
  const tok = `$${t.symbol} (${t.address})`;
  if (agent.gradingMode === "price7d") {
    return agent.category === "Research" ? `Research brief on ${tok}: long or short for the next 7 days?` : `Long or short ${tok} for the next 7 days?`;
  }
  return agent.category === "Security" ? `Is ${tok} safe to buy?` : `Is ${tok} SAFE, CAUTION or RISKY right now?`;
}
