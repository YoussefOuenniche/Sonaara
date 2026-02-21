"use client";

export function VinylLogo({ size = 88 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Sonar ping rings — centered on the vinyl */}
      <div className="sonar-ring" />
      <div className="sonar-ring sonar-ring-2" />
      <div className="sonar-ring sonar-ring-3" />

      {/* Spinning vinyl record */}
      <div className="vinyl-spin relative z-10">
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer vinyl body */}
          <circle cx="50" cy="50" r="49" fill="#1c1230" />
          <circle cx="50" cy="50" r="48" fill="#180f2a" />

          {/* Groove rings */}
          <circle cx="50" cy="50" r="46" stroke="#2d1d4a" strokeWidth="0.5" fill="none" />
          <circle cx="50" cy="50" r="43" stroke="#2a1945" strokeWidth="0.5" fill="none" />
          <circle cx="50" cy="50" r="40" stroke="#2d1d4a" strokeWidth="0.5" fill="none" />
          <circle cx="50" cy="50" r="37" stroke="#2a1945" strokeWidth="0.5" fill="none" />
          <circle cx="50" cy="50" r="34" stroke="#2d1d4a" strokeWidth="0.5" fill="none" />
          <circle cx="50" cy="50" r="31" stroke="#2a1945" strokeWidth="0.5" fill="none" />
          <circle cx="50" cy="50" r="28" stroke="#2d1d4a" strokeWidth="0.5" fill="none" />

          {/* Center label */}
          <circle cx="50" cy="50" r="16" fill="#7c55c8" />
          <circle cx="50" cy="50" r="14" fill="#8f62d8" opacity="0.85" />
          <circle cx="50" cy="50" r="11" fill="#a87de8" opacity="0.6" />

          {/* Label text — small "s" */}
          <text
            x="50"
            y="54.5"
            textAnchor="middle"
            fill="rgba(255,255,255,0.75)"
            fontSize="11"
            fontFamily="-apple-system, sans-serif"
            fontWeight="600"
            letterSpacing="-0.5"
          >
            s
          </text>

          {/* Spindle hole */}
          <circle cx="50" cy="50" r="2.5" fill="#0e0a1a" />
        </svg>
      </div>
    </div>
  );
}
