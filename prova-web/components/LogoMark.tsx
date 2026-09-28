// The Veraim "Point" mark as inline SVG (for OG images and anywhere CSS backgrounds don't work).
export default function LogoMark({ size = 24, color = "#EDEDEF" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M22 20 L49 70 M98 20 L71 70" fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" />
      <circle cx="60" cy="96" r="13" fill={color} />
    </svg>
  );
}
