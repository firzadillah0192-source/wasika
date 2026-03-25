export function BatikStarDiamond({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.05 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="star-diamond" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M12 0L24 12L12 24L0 12Z" fill="none" stroke="#d4a843" strokeWidth="0.5" />
          <circle cx="12" cy="12" r="2.5" fill="none" stroke="#d4a843" strokeWidth="0.5" />
          <path d="M12 4L14 10L12 8L10 10Z" fill="#d4a843" opacity="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#star-diamond)" />
    </svg>
  )
}
