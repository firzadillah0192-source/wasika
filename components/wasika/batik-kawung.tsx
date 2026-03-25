export function BatikKawung({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.055 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="kawung" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
          <ellipse cx="18" cy="9" rx="7" ry="8" fill="none" stroke="#d4a843" strokeWidth="0.8" />
          <ellipse cx="18" cy="27" rx="7" ry="8" fill="none" stroke="#d4a843" strokeWidth="0.8" />
          <ellipse cx="9" cy="18" rx="8" ry="7" fill="none" stroke="#d4a843" strokeWidth="0.8" />
          <ellipse cx="27" cy="18" rx="8" ry="7" fill="none" stroke="#d4a843" strokeWidth="0.8" />
          <circle cx="18" cy="18" r="2" fill="#d4a843" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kawung)" />
    </svg>
  )
}
