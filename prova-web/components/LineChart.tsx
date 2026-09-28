// 30-day track record chart (40%–100% scale). Days before an agent's first graded call are null.
type Line = { d: (number | null)[]; c: string; fill?: boolean };

export default function LineChart({ id, list, w = 560, h = 210 }: { id: string; list: Line[]; w?: number; h?: number }) {
  const min = 40, max = 100, L0 = 34;
  const n = Math.max(...list.map((l) => l.d.length), 2);
  const px = (i: number) => L0 + (i / (n - 1)) * (w - L0 - 6);
  const py = (v: number) => 6 + (h - 12) - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (h - 12);
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {[50, 60, 70, 80, 90].map((y) => (
        <g key={y}>
          <line x1={L0} x2={w} y1={py(y)} y2={py(y)} stroke="rgba(255,255,255,.05)" />
          <text x="0" y={py(y) + 3.5} fill="#6E6E78" fontSize="10.5" style={{ fontFamily: "var(--m)" }}>{y}%</text>
        </g>
      ))}
      {list.map((L, j) => {
        const pts = L.d.map((v, i) => (v === null ? null : [px(i), py(v)] as const)).filter((p): p is readonly [number, number] => !!p);
        if (!pts.length) return null;
        const str = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`);
        const gid = `${id}-fg${j}`;
        const [lx, ly] = pts[pts.length - 1];
        return (
          <g key={j}>
            {L.fill && pts.length > 1 && (
              <>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={L.c} stopOpacity=".22" />
                    <stop offset="1" stopColor={L.c} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`M${pts[0][0].toFixed(1)},${h} L${str.join(" L")} L${lx.toFixed(1)},${h}Z`} fill={`url(#${gid})`} />
              </>
            )}
            <polyline points={str.join(" ")} fill="none" stroke={L.c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lx} cy={ly} r="3.5" fill={L.c} />
          </g>
        );
      })}
    </svg>
  );
}
