export function BatikParang({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.12 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="parang" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* Main diagonal parang curves - bold stripes */}
          <path d="M0 40 C10 30 20 10 20 0" fill="none" stroke="#d4a843" strokeWidth="1.8" />
          <path d="M20 40 C30 30 40 10 40 0" fill="none" stroke="#d4a843" strokeWidth="1.8" />
          {/* Secondary parallel curve (inner) */}
          <path d="M0 40 C8 32 15 15 17 0" fill="none" stroke="#d4a843" strokeWidth="0.7" opacity="0.5" />
          <path d="M20 40 C28 32 35 15 37 0" fill="none" stroke="#d4a843" strokeWidth="0.7" opacity="0.5" />
          {/* Cross-hatching accent lines */}
          <path d="M0 20 C5 15 15 5 20 0" fill="none" stroke="#d4a843" strokeWidth="0.5" opacity="0.35" />
          <path d="M20 20 C25 15 35 5 40 0" fill="none" stroke="#d4a843" strokeWidth="0.5" opacity="0.35" />
          {/* Small diamond accents between stripes */}
          <path d="M10 20 L12 18 L14 20 L12 22 Z" fill="#d4a843" opacity="0.4" />
          <path d="M30 20 L32 18 L34 20 L32 22 Z" fill="#d4a843" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#parang)" />
    </svg>
  )
}
