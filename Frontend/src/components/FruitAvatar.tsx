import type { ReactElement } from 'react'
import type { Fruit } from '../lib/fruit'

// Ported from design/StyleGuide.dc.html — keep in sync with
// that reference sheet. Placeholder character art; see [[frontend-design-direction]]
// in project memory for the plan to replace these with real illustration.

const INK = '#3A2B4D'

function Apple() {
  return (
    <>
      <ellipse cx={40} cy={15} rx={7} ry={4.5} fill="#5FBE6B" stroke={INK} strokeWidth={2.2} transform="rotate(-20 40 15)" />
      <rect x={29.5} y={8} width={5} height={11} rx={2.5} fill="#8B5E3C" stroke={INK} strokeWidth={2.2} />
      <circle cx={32} cy={37} r={22} fill="#FF6F61" stroke={INK} strokeWidth={2.6} />
      <circle cx={24} cy={34} r={2.6} fill={INK} />
      <circle cx={40} cy={34} r={2.6} fill={INK} />
      <ellipse cx={21} cy={41} rx={4.2} ry={2.6} fill="#FF9E90" opacity={0.6} />
      <ellipse cx={43} cy={41} rx={4.2} ry={2.6} fill="#FF9E90" opacity={0.6} />
      <path d="M25 42 Q32 47 39 42" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </>
  )
}

function Orange() {
  return (
    <>
      <path d="M32 8 L34 13 L29 13 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} />
      <circle cx={32} cy={35} r={22} fill="#FFA23C" stroke={INK} strokeWidth={2.6} />
      <circle cx={24} cy={33} r={2.6} fill={INK} />
      <circle cx={40} cy={33} r={2.6} fill={INK} />
      <ellipse cx={21} cy={40} rx={4.2} ry={2.6} fill="#FFD199" opacity={0.7} />
      <ellipse cx={43} cy={40} rx={4.2} ry={2.6} fill="#FFD199" opacity={0.7} />
      <path d="M25 41 Q32 46 39 41" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </>
  )
}

function Banana() {
  return (
    <g transform="rotate(-18 32 32)">
      <rect x={10} y={24} width={44} height={20} rx={10} fill="#FFC94D" stroke={INK} strokeWidth={2.6} />
      <ellipse cx={12} cy={34} rx={3.2} ry={4.2} fill="#8B5E3C" stroke={INK} strokeWidth={1.6} />
      <circle cx={26} cy={32} r={2.4} fill={INK} />
      <circle cx={38} cy={32} r={2.4} fill={INK} />
      <ellipse cx={23} cy={38} rx={3.6} ry={2.2} fill="#FFE1A3" opacity={0.8} />
      <ellipse cx={41} cy={38} rx={3.6} ry={2.2} fill="#FFE1A3" opacity={0.8} />
      <path d="M27 40 Q32 44 37 40" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

function Grape() {
  return (
    <>
      <path d="M31 6 L33 12 L28 12 Z" fill="#5FBE6B" stroke={INK} strokeWidth={1.8} />
      <circle cx={22} cy={24} r={9} fill="#9B7EDE" stroke={INK} strokeWidth={2.2} />
      <circle cx={42} cy={24} r={9} fill="#9B7EDE" stroke={INK} strokeWidth={2.2} />
      <circle cx={32} cy={40} r={13} fill="#9B7EDE" stroke={INK} strokeWidth={2.4} />
      <circle cx={26} cy={38} r={2.3} fill={INK} />
      <circle cx={38} cy={38} r={2.3} fill={INK} />
      <ellipse cx={23} cy={44} rx={3.6} ry={2.2} fill="#D6BFFA" opacity={0.8} />
      <ellipse cx={41} cy={44} rx={3.6} ry={2.2} fill="#D6BFFA" opacity={0.8} />
      <path d="M27 45 Q32 49 37 45" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  )
}

function Strawberry() {
  return (
    <>
      <path d="M22 16 L18 8 M32 15 L32 6 M42 16 L46 8" stroke="#5FBE6B" strokeWidth={2.4} strokeLinecap="round" />
      <path
        d="M32 54 C18 44, 12 28, 20 18 C24 13, 30 15, 32 20 C34 15, 40 13, 44 18 C52 28, 46 44, 32 54 Z"
        fill="#FF6F61"
        stroke={INK}
        strokeWidth={2.6}
      />
      <circle cx={24} cy={34} r={2.3} fill={INK} />
      <circle cx={40} cy={34} r={2.3} fill={INK} />
      <ellipse cx={21} cy={40} rx={3.8} ry={2.3} fill="#FF9E90" opacity={0.6} />
      <ellipse cx={43} cy={40} rx={3.8} ry={2.3} fill="#FF9E90" opacity={0.6} />
      <path d="M25 41 Q32 46 39 41" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={26} cy={28} rx={1.6} ry={2.2} fill="#FFC94D" transform="rotate(-20 26 28)" />
      <ellipse cx={38} cy={28} rx={1.6} ry={2.2} fill="#FFC94D" transform="rotate(20 38 28)" />
      <ellipse cx={32} cy={46} rx={1.6} ry={2.2} fill="#FFC94D" />
    </>
  )
}

function Watermelon() {
  return (
    <>
      <path d="M8 46 A24 24 0 0 1 56 46 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2.6} />
      <path d="M14 46 A18 18 0 0 1 50 46 Z" fill="#FFF8EC" stroke={INK} strokeWidth={1.6} />
      <path d="M19 46 A13 13 0 0 1 45 46 Z" fill="#FF6F61" stroke={INK} strokeWidth={2.2} />
      <circle cx={27} cy={40} r={1.6} fill={INK} />
      <circle cx={37} cy={40} r={1.6} fill={INK} />
      <circle cx={24} cy={34} r={2.3} fill={INK} />
      <circle cx={40} cy={34} r={2.3} fill={INK} />
      <ellipse cx={21} cy={39} rx={3.4} ry={2} fill="#FF9E90" opacity={0.6} />
      <ellipse cx={43} cy={39} rx={3.4} ry={2} fill="#FF9E90" opacity={0.6} />
      <path d="M25 40 Q32 44 39 40" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  )
}

const BODIES: Record<Fruit, () => ReactElement> = {
  apple: Apple,
  orange: Orange,
  banana: Banana,
  grape: Grape,
  strawberry: Strawberry,
  watermelon: Watermelon,
}

export function FruitAvatar({ kind, size = 28 }: { kind: Fruit; size?: number }) {
  const Body = BODIES[kind]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <Body />
    </svg>
  )
}
