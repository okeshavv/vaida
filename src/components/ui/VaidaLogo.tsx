interface VaidaLogoProps {
  className?: string;
}

export default function VaidaLogo({ className = '' }: VaidaLogoProps) {
  return (
    <svg
      viewBox="0 0 240 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VAIDA"
    >
      {/* V - Standalone Stethoscope Headset (Large & Dominant) */}
      <g id="stethoscope-headset">
        {/* Left Earpiece */}
        <ellipse cx="15" cy="15" rx="6" ry="8" fill="#FFFFFF" />
        <ellipse cx="15" cy="15" rx="4" ry="6" fill="#E5E7EB" />

        {/* Left Binaural Tube */}
        <path
          d="M 15 23 Q 15 28 18 32 L 30 55"
          stroke="#9CA3AF"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Earpiece */}
        <ellipse cx="55" cy="15" rx="6" ry="8" fill="#FFFFFF" />
        <ellipse cx="55" cy="15" rx="4" ry="6" fill="#E5E7EB" />

        {/* Right Binaural Tube */}
        <path
          d="M 55 23 Q 55 28 52 32 L 40 55"
          stroke="#9CA3AF"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Y-Junction */}
        <circle cx="35" cy="56" r="4" fill="#9CA3AF" />
        <circle cx="35" cy="56" r="2" fill="#FFFFFF" />
      </g>

      {/* Letter A - Bold Sans-Serif */}
      <text
        x="85"
        y="55"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="42"
        fontWeight="700"
        fill="#FFFFFF"
        textAnchor="middle"
      >
        A
      </text>

      {/* Letter i - Tube Stem with Diaphragm Dot */}
      <g id="letter-i">
        {/* Stem (white tube) */}
        <rect
          x="118"
          y="25"
          width="6"
          height="30"
          rx="3"
          fill="#FFFFFF"
        />

        {/* Diaphragm (chest piece) as the dot */}
        <circle cx="121" cy="62" r="7" fill="#9CA3AF" />
        <circle cx="121" cy="62" r="5" fill="#FFFFFF" />
        <circle cx="121" cy="62" r="3" fill="#E5E7EB" />
      </g>

      {/* Letters D and A - Bold Sans-Serif */}
      <text
        x="150"
        y="55"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="42"
        fontWeight="700"
        fill="#FFFFFF"
      >
        DA
      </text>
    </svg>
  );
}
