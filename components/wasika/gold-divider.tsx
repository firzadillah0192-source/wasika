interface GoldDividerProps {
  className?: string
}

export function GoldDivider({ className = "" }: GoldDividerProps) {
  return (
    <div className={`w-full flex items-center gap-3 ${className}`}>
      <div
        className="flex-1 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #d4a843, transparent)", opacity: 0.35 }}
      />
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5Z" fill="#d4a843" opacity="0.7" />
      </svg>
      <div
        className="flex-1 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #d4a843, transparent)", opacity: 0.35 }}
      />
    </div>
  )
}
