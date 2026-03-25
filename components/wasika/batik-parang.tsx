export function BatikParang({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.055 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="parang" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 28 Q7 14 14 0" fill="none" stroke="#d4a843" strokeWidth="0.7" />
          <path d="M14 28 Q21 14 28 0" fill="none" stroke="#d4a843" strokeWidth="0.7" />
          <path d="M0 14 Q7 7 14 0" fill="none" stroke="#d4a843" strokeWidth="0.4" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#parang)" />
    </svg>
  )
}
