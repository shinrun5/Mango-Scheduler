export const FRUITS = [
  'apple',
  'orange',
  'banana',
  'grape',
  'strawberry',
  'watermelon',
  'honeydew',
  'dragonfruit',
  'pineapple',
  'lemon',
  'lime',
  'peach',
  'pear',
  'cherry',
  'blueberry',
  'plum',
  'starfruit',
  'coconut',
  'mango',
  'pomegranate',
  'fig',
  'kiwi',
  'raspberry',
  'blackberry',
  'cantaloupe',
  'papaya',
  'apricot',
  'passionfruit',
  'guava',
  'tangerine',
  'avocado',
  'lychee',
  'persimmon',
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

/** The person's chosen fruit if they have a valid one, else the deterministic default. */
export function fruitForPerson(p: { employeeId: number; avatarFruit?: string | null }): Fruit {
  return p.avatarFruit && (FRUITS as readonly string[]).includes(p.avatarFruit)
    ? (p.avatarFruit as Fruit)
    : fruitFor(p.employeeId)
}
