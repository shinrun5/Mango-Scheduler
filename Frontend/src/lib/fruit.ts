export const FRUITS = [
  'apple',
  'orange',
  'banana',
  'grape',
  'strawberry',
  'watermelon',
] as const

export type Fruit = (typeof FRUITS)[number]

/**
 * No `avatarFruit` column exists yet, so each employee gets a stable fruit
 * derived from their id. Deterministic and collision-tolerant (two people can
 * share a fruit) rather than random-per-render. Swap for a real column
 * whenever avatar picking becomes a product feature.
 */
export function fruitFor(employeeId: number): Fruit {
  return FRUITS[employeeId % FRUITS.length]
}
