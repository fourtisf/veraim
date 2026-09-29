import type { CSSProperties } from "react";
import LogoMark from "./LogoMark";

type A = { name: string; colors: [string, string]; official?: boolean };

// Official agents wear the Veraim mark; creators' agents get a colored initial.
export default function Avatar({ a, style }: { a: A; style?: CSSProperties }) {
  if (a.official) {
    return (
      <div className="av av-v" style={style}>
        <LogoMark size={20} />
      </div>
    );
  }
  return (
    <div className="av" style={{ "--c1": a.colors[0], "--c2": a.colors[1], ...style } as CSSProperties}>
      {a.name[0]}
    </div>
  );
}
