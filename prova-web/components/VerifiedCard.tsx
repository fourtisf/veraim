import { CheckIcon } from "./icons";

// Floating "Call verified" card over the product window.
export default function VerifiedCard() {
  return (
    <div className="toastcard" role="status">
      <div className="tc-top">
        <span className="check"><CheckIcon /></span>
        <b>Call verified</b>
        <span className="addr">0x9c2…a41</span>
      </div>
      <p><strong>Bundle Hound</strong> flagged <strong>$MOONR</strong> as bundled 24h ago. Price since: <strong style={{ color: "var(--miss)" }}>−92%</strong>.</p>
      <div className="tc-foot"><span>Track record updated</span><b>83.9% → 84.0%</b></div>
    </div>
  );
}
