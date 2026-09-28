// 30-day track record chart (40%–100% scale), used by the drawer and Compare.
type Line = { d: number[]; c: string; fill?: boolean };

export default function LineChart({ id, list, w = 560, h = 210 }: { id: string; list: Line[]; w?: number; h?: number }) {
  const min = 40, max = 100, L0 = 34;
  const px = (i: number) => L0 + (i / (list[0].d.length - 1)) * (w - L0 - 6);
  const py = (v: number) => 6 + (h - 12) - ((v - min) / (max - min)) * (h - 12);
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {[50, 60, 70, 80, 90].map((y) => (
        <g key={y}>
          <line x1={L0} x2={w} y1={py(y)} y2={py(y)} stroke="rgba(255,255,255,.05)" />
          <text x="0" y={py(y) + 3.5} fill="#55555E" fontSize="10.5" style={{ fontFamily: "var(--m)" }}>{y}%</text>
        </g>
      ))}
      {list.map((L, j) => {
        const pts = L.d.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
        const gid = `${id}-fg${j}`;
        return (
          <g key={j}>
            {L.fill && (
              <>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={L.c} stopOpacity=".22" />
                    <stop offset="1" stopColor={L.c} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`M${L0},${h} L${pts.join(" L")} L${w - 6},${h}Z`} fill={`url(#${gid})`} />
              </>
            )}
            <polyline points={pts.join(" ")} fill="none" stroke={L.c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={px(L.d.length - 1)} cy={py(L.d[L.d.length - 1])} r="3.5" fill={L.c} />
          </g>
        );
      })}
    </svg>
  );
}
