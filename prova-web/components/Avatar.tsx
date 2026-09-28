import type { CSSProperties } from "react";
import type { Agent } from "@/lib/mock";

export default function Avatar({ a, style }: { a: Agent; style?: CSSProperties }) {
  return (
    <div className="av" style={{ "--c1": a.c[0], "--c2": a.c[1], ...style } as CSSProperties}>
      {a.n[0]}
    </div>
  );
}
