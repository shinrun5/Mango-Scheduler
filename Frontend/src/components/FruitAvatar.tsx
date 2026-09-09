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
  // a fat, chunky crescent: tip top-left, tip bottom-right, thick belly in the middle
  return (
    <>
      <path
        d="M13 12 C9 11 7 16 9 22 C14 47 30 60 50 57 C57 56 59 48 53 44 C51 42.5 47 44 44 44 C31 43 22 31 21 16 C20 10 16 11 13 12 Z"
        fill="#FFCF4D"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <ellipse cx={13} cy={12} rx={3.2} ry={3.8} fill="#7A4A2C" stroke={INK} strokeWidth={1.8} transform="rotate(-32 13 12)" />
      <ellipse cx={51} cy={53} rx={3.8} ry={3.2} fill="#7A4A2C" stroke={INK} strokeWidth={1.8} />
      <path
        d="M18 20 C22 38 34 49 47 49"
        fill="none"
        stroke="#EDB42E"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.7}
      />
      <circle cx={27} cy={44} r={2.6} fill={INK} />
      <circle cx={37} cy={47} r={2.6} fill={INK} />
      <ellipse cx={23} cy={48} rx={3.6} ry={2.1} fill="#FFE7A8" opacity={0.9} transform="rotate(30 23 48)" />
      <ellipse cx={41} cy={51} rx={3.6} ry={2.1} fill="#FFE7A8" opacity={0.9} transform="rotate(30 41 51)" />
      <path d="M28 50 Q33 55 39 52" fill="none" stroke={INK} strokeWidth={2.1} strokeLinecap="round" />
    </>
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
  // a whole round melon: green rind with darker curved stripes
  return (
    <>
      <path d="M31 13 L33 7" stroke="#8B5E3C" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={32} cy={36} r={22} fill="#57B75F" stroke={INK} strokeWidth={2.6} />
      <path d="M22 16 Q17 36 22 56" fill="none" stroke="#2E7D3C" strokeWidth={3.4} strokeLinecap="round" opacity={0.75} />
      <path d="M27 14 Q24 36 27 58" fill="none" stroke="#2E7D3C" strokeWidth={3.4} strokeLinecap="round" opacity={0.75} />
      <path d="M32 13 Q32 36 32 59" fill="none" stroke="#2E7D3C" strokeWidth={3.4} strokeLinecap="round" opacity={0.75} />
      <path d="M37 14 Q40 36 37 58" fill="none" stroke="#2E7D3C" strokeWidth={3.4} strokeLinecap="round" opacity={0.75} />
      <path d="M42 16 Q47 36 42 56" fill="none" stroke="#2E7D3C" strokeWidth={3.4} strokeLinecap="round" opacity={0.75} />
      <path d="M14 30 Q32 22 50 30" fill="none" stroke="#7CCB80" strokeWidth={2.6} strokeLinecap="round" opacity={0.6} />
      <Face cy={38} blush="#8FCF95" />
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
  // the grumpy one: furrowed brows, round glasses, a scowl
  return (
    <>
      <path d="M24 40 Q30 16 34 10 M44 42 Q42 18 34 10" fill="none" stroke="#5FBE6B" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M34 10 Q44 4 50 12 Q42 16 34 10 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={22} cy={44} r={12} fill="#E14F3D" stroke={INK} strokeWidth={2.6} />
      <circle cx={44} cy={46} r={13} fill="#FF6F61" stroke={INK} strokeWidth={2.6} />
      {/* glasses */}
      <circle cx={40} cy={45} r={4.6} fill="#FFF3EE" stroke={INK} strokeWidth={2} />
      <circle cx={50} cy={45} r={4.6} fill="#FFF3EE" stroke={INK} strokeWidth={2} />
      <path d="M44.4 44.5 Q45 43.4 45.6 44.5" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M54.4 43.5 L57 42.5" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <circle cx={40} cy={45.5} r={2} fill={INK} />
      <circle cx={50} cy={45.5} r={2} fill={INK} />
      {/* angry brows, inner ends dipped toward the nose */}
      <path d="M35 39 L44 42.5" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M55 39 L46 42.5" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      {/* scowl */}
      <path d="M40 54 Q45 49 50 54" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
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

function Kiwi() {
  // a cross-cut slice: fuzzy brown skin, pale green flesh, cream core, seed ring
  const seeds = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    return <circle key={i} cx={32 + Math.cos(a) * 12} cy={36 + Math.sin(a) * 12} r={1.3} fill={INK} />
  })
  return (
    <>
      <circle cx={32} cy={36} r={22} fill="#A97C4F" stroke={INK} strokeWidth={2.6} />
      <circle cx={32} cy={36} r={18} fill="#93C24E" stroke={INK} strokeWidth={1.4} />
      <circle cx={32} cy={36} r={5} fill="#F2F5DC" />
      {seeds}
      <circle cx={25} cy={31} r={2.3} fill={INK} />
      <circle cx={39} cy={31} r={2.3} fill={INK} />
      <path d="M26 41 Q32 46 38 41" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </>
  )
}

/** A dome of little drupelets — the shape both berries share. */
function Berrylet({ fill, blush }: { fill: string; blush: string }) {
  const pts: [number, number][] = [
    [24, 40], [32, 42], [40, 40],
    [21, 32], [28, 33], [36, 33], [43, 32],
    [25, 25], [32, 25], [39, 25],
    [29, 19], [35, 19],
  ]
  return (
    <>
      <path d="M32 16 Q37 9 44 11 Q40 18 33 18 Z" fill="#5FBE6B" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} fill={fill} stroke={INK} strokeWidth={1.8} />
      ))}
      <circle cx={28} cy={33} r={2.1} fill={INK} />
      <circle cx={36} cy={33} r={2.1} fill={INK} />
      <ellipse cx={24} cy={38} rx={3} ry={1.8} fill={blush} opacity={0.7} />
      <ellipse cx={40} cy={38} rx={3} ry={1.8} fill={blush} opacity={0.7} />
      <path d="M28 39 Q32 43 36 39" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  )
}

function Raspberry() {
  return <Berrylet fill="#D6416B" blush="#EE9DB6" />
}

function Blackberry() {
  return <Berrylet fill="#463157" blush="#8E76A6" />
}

function Cantaloupe() {
  return (
    <>
      <circle cx={32} cy={36} r={22} fill="#E9C892" stroke={INK} strokeWidth={2.6} />
      <path
        d="M12 30 Q32 24 52 30 M12 40 Q32 34 52 40 M20 16 Q26 36 22 55 M44 16 Q38 36 42 55"
        fill="none"
        stroke="#C9A566"
        strokeWidth={1.6}
        opacity={0.8}
      />
      <Face cy={37} blush="#DBBE8C" />
    </>
  )
}

function Papaya() {
  return (
    <>
      <rect x={30.5} y={9} width={3} height={7} rx={1.5} fill="#8B5E3C" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={32} cy={37} rx={16} ry={22} fill="#F4A24C" stroke={INK} strokeWidth={2.6} />
      <ellipse cx={32} cy={44} rx={5.5} ry={9} fill="#E4743E" opacity={0.5} />
      <Face cy={33} blush="#FFCB9A" />
    </>
  )
}

function Apricot() {
  return (
    <>
      <path d="M32 12 Q37 7 43 10" fill="none" stroke="#5FBE6B" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M40 9 Q47 8 47 15 Q40 15 40 9 Z" fill="#5FBE6B" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={32} cy={38} r={19} fill="#F6AC55" stroke={INK} strokeWidth={2.6} />
      <path d="M32 20 Q28 38 32 56" fill="none" stroke={INK} strokeWidth={1.6} opacity={0.4} />
      <Face cy={38} blush="#FFC98F" />
    </>
  )
}

function Passionfruit() {
  return (
    <>
      <rect x={30.5} y={9} width={3} height={6} rx={1.5} fill="#8B5E3C" stroke={INK} strokeWidth={1.8} />
      <circle cx={32} cy={39} r={20} fill="#5C2A4E" stroke={INK} strokeWidth={2.6} />
      <ellipse cx={32} cy={25} rx={13} ry={5} fill="#E7C766" stroke={INK} strokeWidth={1.6} />
      <circle cx={26} cy={24} r={1.4} fill="#7A4A2C" />
      <circle cx={34} cy={26} r={1.4} fill="#7A4A2C" />
      <Face cy={42} blush="#9A6B8C" />
    </>
  )
}

function Guava() {
  return (
    <>
      <path d="M32 11 Q36 6 42 8" fill="none" stroke="#5FBE6B" strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={32} cy={38} r={20} fill="#BBD06B" stroke={INK} strokeWidth={2.6} />
      <circle cx={32} cy={41} r={8} fill="#F19FB0" opacity={0.55} />
      <path d="M32 22 L33 15 L34 22 Z" fill="#5FBE6B" stroke={INK} strokeWidth={1.4} />
      <Face cy={36} blush="#D8E4A2" />
    </>
  )
}

function Tangerine() {
  return (
    <>
      <path d="M33 18 Q43 10 50 16 Q42 23 33 19 Z" fill="#5FBE6B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M30 16 L28 9" stroke="#8B5E3C" strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={32} cy={38} rx={21} ry={18} fill="#FF922E" stroke={INK} strokeWidth={2.6} />
      <path d="M13 34 Q32 26 51 34" fill="none" stroke="#FFB265" strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
      <Face cy={39} blush="#FFD199" />
    </>
  )
}

function Avocado() {
  return (
    <>
      <path d="M30 10 Q34 6 39 9" fill="none" stroke="#5FBE6B" strokeWidth={2.2} strokeLinecap="round" />
      <path
        d="M32 11 C24 11 20 23 20 33 C20 47 25 58 32 58 C39 58 44 47 44 33 C44 23 40 11 32 11 Z"
        fill="#88AC53"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <path
        d="M32 15 C26 15 23 25 23 34 C23 46 27 55 32 55 C37 55 41 46 41 34 C41 25 38 15 32 15 Z"
        fill="#CFE0A0"
      />
      <circle cx={32} cy={41} r={9} fill="#9A6B3E" stroke={INK} strokeWidth={2} />
      <circle cx={29} cy={27} r={2.1} fill={INK} />
      <circle cx={35} cy={27} r={2.1} fill={INK} />
      <path d="M29 31 Q32 34 35 31" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  )
}

function Lychee() {
  return (
    <>
      <rect x={30.5} y={9} width={3} height={6} rx={1.5} fill="#5FBE6B" stroke={INK} strokeWidth={1.8} />
      <circle cx={32} cy={38} r={19} fill="#E06A5A" stroke={INK} strokeWidth={2.6} />
      <path
        d="M20 34 L24 38 M28 22 L32 26 M40 24 L44 28 M22 46 L26 50 M40 44 L44 48 M32 48 L36 52"
        stroke="#B24A3E"
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Face cy={38} blush="#F2A99B" />
    </>
  )
}

function Persimmon() {
  return (
    <>
      <path
        d="M21 19 L32 11 L43 19 L38 25 L32 21 L26 25 Z"
        fill="#6BAE4F"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <rect x={30.5} y={8} width={3} height={6} rx={1.5} fill="#8B5E3C" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={32} cy={41} rx={21} ry={17} fill="#F2812F" stroke={INK} strokeWidth={2.6} />
      <Face cy={42} blush="#FBB582" />
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
  kiwi: Kiwi,
  raspberry: Raspberry,
  blackberry: Blackberry,
  cantaloupe: Cantaloupe,
  papaya: Papaya,
  apricot: Apricot,
  passionfruit: Passionfruit,
  guava: Guava,
  tangerine: Tangerine,
  avocado: Avocado,
  lychee: Lychee,
  persimmon: Persimmon,
}

export function FruitAvatar({ kind, size = 28 }: { kind: Fruit; size?: number }) {
  const Body = BODIES[kind]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <Body />
    </svg>
  )
}
