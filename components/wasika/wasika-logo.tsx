interface WaSiKaLogoProps {
  size?: number
  className?: string
}

export function WaSiKaLogo({ size = 64, className = "" }: WaSiKaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded rect */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="rgba(212,168,67,0.12)" stroke="#cd7f32" strokeWidth="1.2" />

      {/* Tree trunk */}
      <line x1="32" y1="50" x2="32" y2="34" stroke="#cd7f32" strokeWidth="2.5" strokeLinecap="round" />

      {/* Root branches */}
      <line x1="32" y1="50" x2="22" y2="56" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="50" x2="42" y2="56" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" />

      {/* Main branches */}
      <line x1="32" y1="40" x2="20" y2="34" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="40" x2="44" y2="34" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" />

      {/* Crown circle (main) */}
      <circle cx="32" cy="24" r="10" fill="none" stroke="#d4a843" strokeWidth="1.5" />
      <circle cx="32" cy="24" r="5.5" fill="#d4a843" opacity="0.35" />

      {/* Side crowns */}
      <circle cx="18" cy="30" r="6.5" fill="none" stroke="#d4a843" strokeWidth="1" opacity="0.7" />
      <circle cx="18" cy="30" r="3" fill="#d4a843" opacity="0.2" />
      <circle cx="46" cy="30" r="6.5" fill="none" stroke="#d4a843" strokeWidth="1" opacity="0.7" />
      <circle cx="46" cy="30" r="3" fill="#d4a843" opacity="0.2" />

      {/* Gold accent dots */}
      <circle cx="32" cy="24" r="2" fill="#f5c842" />
      <circle cx="18" cy="30" r="1.5" fill="#d4a843" opacity="0.8" />
      <circle cx="46" cy="30" r="1.5" fill="#d4a843" opacity="0.8" />
    </svg>
  )
}
