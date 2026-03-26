export function BatikKawung({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.12 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="kawung" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          {/* Four petals of kawung flower */}
          <ellipse cx="24" cy="10" rx="8" ry="10" fill="none" stroke="#d4a843" strokeWidth="1.2" />
          <ellipse cx="24" cy="38" rx="8" ry="10" fill="none" stroke="#d4a843" strokeWidth="1.2" />
          <ellipse cx="10" cy="24" rx="10" ry="8" fill="none" stroke="#d4a843" strokeWidth="1.2" />
          <ellipse cx="38" cy="24" rx="10" ry="8" fill="none" stroke="#d4a843" strokeWidth="1.2" />
          {/* Center dot */}
          <circle cx="24" cy="24" r="2.5" fill="#d4a843" opacity="0.6" />
          {/* Corner diamonds */}
          <circle cx="0" cy="0" r="1.5" fill="#d4a843" opacity="0.4" />
          <circle cx="48" cy="0" r="1.5" fill="#d4a843" opacity="0.4" />
          <circle cx="0" cy="48" r="1.5" fill="#d4a843" opacity="0.4" />
          <circle cx="48" cy="48" r="1.5" fill="#d4a843" opacity="0.4" />
          {/* Inner petal details */}
          <ellipse cx="24" cy="10" rx="3.5" ry="4.5" fill="none" stroke="#d4a843" strokeWidth="0.5" opacity="0.5" />
          <ellipse cx="24" cy="38" rx="3.5" ry="4.5" fill="none" stroke="#d4a843" strokeWidth="0.5" opacity="0.5" />
          <ellipse cx="10" cy="24" rx="4.5" ry="3.5" fill="none" stroke="#d4a843" strokeWidth="0.5" opacity="0.5" />
          <ellipse cx="38" cy="24" rx="4.5" ry="3.5" fill="none" stroke="#d4a843" strokeWidth="0.5" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kawung)" />
    </svg>
  )
}
