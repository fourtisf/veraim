export default function Toast({ msg, on }: { msg: string; on: boolean }) {
  return (
    <div className={`toast ${on ? "on" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
