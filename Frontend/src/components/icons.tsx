const INK = '#3A2B4D'

export function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="#FFFFFF" />
    </svg>
  )
}

export function StarBadgeIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 L14.5 9.5 L21 10 L16 14.5 L17.5 21 L12 17.5 L6.5 21 L8 14.5 L3 10 L9.5 9.5 Z"
        fill="#FFC94D"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function WarningIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 L22 20 H2 Z" fill="#FF6F61" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <rect x={11} y={9} width={2} height={6} rx={1} fill={INK} />
      <circle cx={12} cy={17.5} r={1.3} fill={INK} />
    </svg>
  )
}
