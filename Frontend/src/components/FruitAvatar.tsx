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

/** Shared chunky face for the fruits below — two dot eyes, blush, a little smile.
 * `cy` is the eye line; blush + mouth sit a touch under it. */
function Face({ cy = 34, blush = '#FFB0A4' }: { cy?: number; blush?: string }) {
  return (
    <>
      <circle cx={24} cy={cy} r={2.5} fill={INK} />
      <circle cx={40} cy={cy} r={2.5} fill={INK} />
      <ellipse cx={20} cy={cy + 6} rx={4} ry={2.4} fill={blush} opacity={0.6} />
      <ellipse cx={44} cy={cy + 6} rx={4} ry={2.4} fill={blush} opacity={0.6} />
      <path
        d={`M25 ${cy + 7} Q32 ${cy + 12} 39 ${cy + 7}`}
        fill="none"
        stroke={INK}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </>
  )
}

function Honeydew() {
  return (
    <>
      <path d="M31 6 L33 12 L28 12 Z" fill="#5FBE6B" stroke={INK} strokeWidth={1.8} />
      <rect x={30} y={9} width={4} height={8} rx={2} fill="#8B5E3C" stroke={INK} strokeWidth={2} />
      <circle cx={32} cy={37} r={22} fill="#CFE8A0" stroke={INK} strokeWidth={2.6} />
      <path d="M14 32 Q32 20 50 32" fill="none" stroke="#E8F3CE" strokeWidth={3} strokeLinecap="round" />
      <Face cy={37} blush="#B7D98A" />
    </>
  )
}

function Dragonfruit() {
  return (
    <>
      <path d="M12 22 Q4 18 8 10 Q16 16 22 20 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M52 22 Q60 18 56 10 Q48 16 42 20 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M10 40 Q2 40 4 32 Q12 36 18 37 Z" fill="#69C97A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M54 40 Q62 40 60 32 Q52 36 46 37 Z" fill="#69C97A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={32} cy={37} rx={17} ry={21} fill="#EC5F9E" stroke={INK} strokeWidth={2.6} />
      <Face cy={38} blush="#F7A9CE" />
    </>
  )
}

function Pineapple() {
  return (
    <>
      <path
        d="M32 3 L25 17 L39 17 Z M22 8 L18 19 L30 18 Z M42 8 L46 19 L34 18 Z"
        fill="#5FBE6B"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <rect x={16} y={18} width={32} height={40} rx={13} fill="#FFC94D" stroke={INK} strokeWidth={2.6} />
      <path
        d="M22 26 L42 42 M42 26 L22 42 M22 40 L38 54 M26 22 L46 40"
        stroke={INK}
        strokeWidth={1.3}
        opacity={0.35}
      />
      <Face cy={38} blush="#FFE1A3" />
    </>
  )
}

function Lemon() {
  return (
    <>
      <path d="M30 12 L26 6 M34 12 L38 7" stroke="#5FBE6B" strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={32} cy={35} rx={21} ry={15} fill="#FFE04D" stroke={INK} strokeWidth={2.6} transform="rotate(-8 32 35)" />
      <circle cx={11} cy={32} r={3} fill="#FFE04D" stroke={INK} strokeWidth={2} />
      <circle cx={53} cy={38} r={3} fill="#FFE04D" stroke={INK} strokeWidth={2} />
      <Face cy={35} blush="#FFEFA6" />
    </>
  )
}

function Lime() {
  return (
    <>
      <path d="M31 7 L33 13 L28 13 Z" fill="#4FA85C" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={32} cy={36} rx={19} ry={17} fill="#8FC740" stroke={INK} strokeWidth={2.6} />
      <path d="M14 30 Q32 20 50 30" fill="none" stroke="#B9DE7E" strokeWidth={2.6} strokeLinecap="round" />
      <Face cy={37} blush="#BFE08A" />
    </>
  )
}

function Peach() {
  return (
    <>
      <path d="M34 12 Q42 6 48 12" fill="none" stroke="#5FBE6B" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M44 9 Q52 8 52 16 Q45 16 44 9 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={32} cy={37} r={21} fill="#FFB27A" stroke={INK} strokeWidth={2.6} />
      <path d="M32 17 Q27 37 32 57" fill="none" stroke={INK} strokeWidth={1.8} opacity={0.45} />
      <Face cy={37} blush="#FF9E90" />
    </>
  )
}

function Pear() {
  return (
    <>
      <rect x={30} y={7} width={4} height={9} rx={2} fill="#8B5E3C" stroke={INK} strokeWidth={2} />
      <path d="M40 10 Q50 8 50 18 Q41 19 40 10 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path
        d="M32 14 C28 14 27 20 28.5 24 C21 28 17 40 21 49 C25 59 39 59 43 49 C47 40 43 28 35.5 24 C37 20 36 14 32 14 Z"
        fill="#BBD65B"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <Face cy={40} blush="#D4E68C" />
    </>
  )
}

function Cherry() {
  return (
    <>
      <path d="M24 40 Q30 16 34 10 M44 42 Q42 18 34 10" fill="none" stroke="#5FBE6B" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M34 10 Q44 4 50 12 Q42 16 34 10 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={22} cy={44} r={12} fill="#E14F3D" stroke={INK} strokeWidth={2.6} />
      <circle cx={44} cy={46} r={13} fill="#FF6F61" stroke={INK} strokeWidth={2.6} />
      <circle cx={40} cy={45} r={2.4} fill={INK} />
      <circle cx={49} cy={45} r={2.4} fill={INK} />
      <ellipse cx={37} cy={51} rx={3.4} ry={2.1} fill="#FF9E90" opacity={0.6} />
      <ellipse cx={52} cy={51} rx={3.4} ry={2.1} fill="#FF9E90" opacity={0.6} />
      <path d="M40 52 Q44.5 56 49 52" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  )
}

function Blueberry() {
  return (
    <>
      <circle cx={32} cy={38} r={20} fill="#6E86D6" stroke={INK} strokeWidth={2.6} />
      <path
        d="M24 20 L28 12 L32 19 L36 12 L40 20 L34 22 L30 22 Z"
        fill="#4A5DA8"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Face cy={40} blush="#A7B6EC" />
    </>
  )
}

function Plum() {
  return (
    <>
      <path d="M32 10 Q36 6 42 8" fill="none" stroke="#5FBE6B" strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={32} cy={37} rx={18} ry={20} fill="#8E5AA8" stroke={INK} strokeWidth={2.6} />
      <path d="M32 18 Q27 37 32 56" fill="none" stroke={INK} strokeWidth={1.8} opacity={0.4} />
      <Face cy={37} blush="#C6A6DA" />
    </>
  )
}

function Starfruit() {
  return (
    <>
      <path
        d="M32 4 L40 24 L60 25 L44 38 L50 58 L32 46 L14 58 L20 38 L4 25 L24 24 Z"
        fill="#FFD84D"
        stroke={INK}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <circle cx={26} cy={30} r={2.6} fill={INK} />
      <circle cx={38} cy={30} r={2.6} fill={INK} />
      <ellipse cx={22} cy={36} rx={3.4} ry={2} fill="#F7B733" opacity={0.7} />
      <ellipse cx={42} cy={36} rx={3.4} ry={2} fill="#F7B733" opacity={0.7} />
      <path d="M27 37 Q32 42 37 37" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </>
  )
}

function Coconut() {
  return (
    <>
      <circle cx={32} cy={35} r={22} fill="#8B5E3C" stroke={INK} strokeWidth={2.6} />
      <path d="M18 22 Q26 30 22 40" fill="none" stroke="#6F4A2E" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M46 24 Q40 32 45 42" fill="none" stroke="#6F4A2E" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <ellipse cx={24} cy={32} rx={3} ry={4} fill={INK} />
      <ellipse cx={40} cy={32} rx={3} ry={4} fill={INK} />
      <ellipse cx={20} cy={39} rx={3.6} ry={2.2} fill="#C79B6E" opacity={0.7} />
      <ellipse cx={44} cy={39} rx={3.6} ry={2.2} fill="#C79B6E" opacity={0.7} />
      <ellipse cx={32} cy={43} rx={3.4} ry={4} fill={INK} />
    </>
  )
}

function Mango() {
  return (
    <>
      <rect x={30} y={9} width={3.5} height={7} rx={1.7} fill="#8B5E3C" stroke={INK} strokeWidth={1.8} />
      <path
        d="M22 20 C36 9 54 16 53 33 C52 49 35 57 25 50 C13 42 12 30 22 20 Z"
        fill="#FFB23C"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <ellipse cx={42} cy={24} rx={9} ry={7} fill="#FF6F61" opacity={0.5} />
      <Face cy={37} blush="#FFCB9A" />
    </>
  )
}

function Pomegranate() {
  return (
    <>
      <path
        d="M25 15 L23 6 L30 13 L32 4 L34 13 L41 6 L39 15 Z"
        fill="#9B2F2C"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={32} cy={38} r={20} fill="#C6413E" stroke={INK} strokeWidth={2.6} />
      <circle cx={27} cy={50} r={1.8} fill="#FFD199" />
      <circle cx={34} cy={52} r={1.8} fill="#FFD199" />
      <Face cy={39} blush="#E88A80" />
    </>
  )
}

function Fig() {
  return (
    <>
      <path d="M32 12 Q37 7 43 9" fill="none" stroke="#5FBE6B" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M18 16 Q12 10 6 12 Q10 20 18 22 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path
        d="M32 13 C29 13 28 18 29.5 22 C20 27 16 43 25 52 C32 59 41 57 45 49 C51 39 47 25 35.5 22 C37 18 36 13 32 13 Z"
        fill="#7B5EA7"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <Face cy={40} blush="#D8A8CF" />
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
  honeydew: Honeydew,
  dragonfruit: Dragonfruit,
  pineapple: Pineapple,
  lemon: Lemon,
  lime: Lime,
  peach: Peach,
  pear: Pear,
  cherry: Cherry,
  blueberry: Blueberry,
  plum: Plum,
  starfruit: Starfruit,
  coconut: Coconut,
  mango: Mango,
  pomegranate: Pomegranate,
  fig: Fig,
}

export function FruitAvatar({ kind, size = 28 }: { kind: Fruit; size?: number }) {
  const Body = BODIES[kind]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <Body />
    </svg>
  )
}
