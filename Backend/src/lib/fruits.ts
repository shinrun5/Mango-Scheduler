// Mirrors Frontend/src/lib/fruit.ts — the set of valid avatar fruits. Kept
// hand-synced (same as types.ts mirroring the schema). Order doesn't matter here.
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
] as const;

export type Fruit = (typeof FRUITS)[number];

export function isFruit(x: unknown): x is Fruit {
  return typeof x === 'string' && (FRUITS as readonly string[]).includes(x);
}
