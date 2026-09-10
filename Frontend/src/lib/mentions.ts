import type { ChatMember } from '../types'

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A name is "mentioned" when `@Name` appears followed by a non-name char (or end),
 * so `@Dan` doesn't match inside `@Daniel`. */
function nameRegex(names: string[]): RegExp | null {
  if (names.length === 0) return null
  // longest first so the alternation prefers "Daniel He" over "Daniel"
  const alt = [...names].sort((a, b) => b.length - a.length).map(esc).join('|')
  return new RegExp(`@(${alt})(?![\\p{L}\\p{N}_])`, 'gu')
}

/** userIds of members whose `@Name` appears in `text`. */
export function deriveMentions(text: string, members: ChatMember[]): number[] {
  const re = nameRegex(members.map((m) => m.name))
  if (!re) return []
  const hit = new Set(text.match(re)?.map((s) => s.slice(1)) ?? [])
  return members.filter((m) => hit.has(m.name)).map((m) => m.userId)
}

export interface Segment {
  text: string
  mention: boolean
}

/** Break `text` into plain / mention segments for rendering. */
export function segmentMentions(text: string, memberNames: string[]): Segment[] {
  const re = nameRegex(memberNames)
  if (!re) return [{ text, mention: false }]
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: text.slice(last, i), mention: false })
    out.push({ text: m[0], mention: true })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), mention: false })
  return out
}
