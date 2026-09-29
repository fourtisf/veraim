import type { CSSProperties } from "react";

type A = { name: string; colors: [string, string] };

export default function Avatar({ a, style }: { a: A; style?: CSSProperties }) {
  return (
    <div className="av" style={{ "--c1": a.colors[0], "--c2": a.colors[1], ...style } as CSSProperties}>
      {a.name.replace(/^Veraim\s+/, "")[0]}
    </div>
  );
}
