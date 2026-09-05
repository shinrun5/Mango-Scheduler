/**
 * The real Mango Mango / Ciao Poke roster, ported from
 * scheduling-prototype/scheduler_real.py (read that file's comments for the full
 * story). 13 employees, real per-store hours, real availability.
 *
 *   npx tsx prisma/seed.ts   (or: npm run seed)
 *
 * Known simplifications vs. the Python prototype -- schema/engine gaps, not bugs:
 *  - No no-back-to-back flag (Rey), no min-shifts floor (Abby), no full/half-day
 *    caps (Kai: 1 full + 2 half/wk) -- these columns don't exist yet.
 *  - No locked/manager-forced shifts -- Cindy's real Friday split (Ciao morning ->
 *    Mango night) isn't pinned; the solver decides Friday freely instead.
 *  - "Allow NEW here but don't require one" isn't representable -- our schema's
 *    newRequired IS the allow-New signal (see [[scheduling-algorithm-approach]]), so
 *    Mango night rows carry newRequired=1 as the closest approximation. On the two
 *    days Rachel L. (the one NEW hire) can't actually cover it, that shows up as a
 *    real, correctly-reported gap -- a decent demo of the escalation path, not a bug.
 */
import prisma from '../src/lib/prisma.js';

// DateTime columns hold a wall-clock time; store it as a fixed date in UTC.
const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const WEEKDAYS = ALL_DAYS.slice(0, 5);
type Day = (typeof ALL_DAYS)[number];
type Tier = 'NEW' | 'REGULAR' | 'SENIOR' | 'MANAGER';

// hour markers from scheduler_real.py, converted to HH:MM
const FULL_M: [string, string] = ['11:30', '23:30']; // "full day" at Mango
const FULL_C: [string, string] = ['10:45', '22:30']; // "full day" at Ciao
const FULL_B: [string, string] = ['10:00', '23:30']; // "full day", either store
const NIGHT_M: [string, string] = ['16:30', '23:30']; // "night" at Mango (grace covers the 17:00 start)

interface EmployeeSeed {
  name: string;
  maxShifts?: number;
  links: Array<{ store: 'Mango' | 'Ciao'; tier: Tier; canOpen?: boolean }>;
  avail: Partial<Record<Day, [string, string][]>>;
}

const EMPLOYEES: EmployeeSeed[] = [
  // --- Mango Mango ---
  {
    name: 'Jasmine',
    links: [{ store: 'Mango', tier: 'REGULAR' }],
    avail: {
      MONDAY: [NIGHT_M], TUESDAY: [NIGHT_M], WEDNESDAY: [NIGHT_M], FRIDAY: [NIGHT_M],
      SATURDAY: [FULL_M], SUNDAY: [FULL_M],
    },
  },
  {
    name: 'Julia',
    links: [{ store: 'Mango', tier: 'SENIOR', canOpen: true }],
    avail: { TUESDAY: [NIGHT_M] },
  },
  {
    // next week: prefers not to work; Mon only
    name: 'Mysha',
    maxShifts: 1,
    links: [{ store: 'Mango', tier: 'REGULAR' }],
    avail: { MONDAY: [FULL_M] },
  },
  {
    name: 'Owen',
    links: [{ store: 'Mango', tier: 'SENIOR', canOpen: true }],
    avail: { WEDNESDAY: [FULL_M], THURSDAY: [FULL_M], FRIDAY: [FULL_M], SATURDAY: [FULL_M], SUNDAY: [FULL_M] },
  },
  {
    name: 'Rachel L.',
    links: [{ store: 'Mango', tier: 'NEW' }],
    avail: {
      MONDAY: [['14:30', '23:30']], TUESDAY: [['14:30', '23:30']],
      WEDNESDAY: [['17:30', '23:30']], THURSDAY: [['17:30', '23:30']],
      FRIDAY: [FULL_M], SATURDAY: [FULL_M], SUNDAY: [FULL_M],
    },
  },
  {
    name: 'Rachel X.',
    links: [{ store: 'Mango', tier: 'SENIOR', canOpen: true }],
    avail: { MONDAY: [FULL_M] },
  },
  {
    name: 'Rey',
    links: [{ store: 'Mango', tier: 'SENIOR', canOpen: true }],
    avail: { TUESDAY: [FULL_M], THURSDAY: [NIGHT_M], FRIDAY: [NIGHT_M], SATURDAY: [FULL_M], SUNDAY: [FULL_M] },
  },
  // --- Ciao Poke (all can open -- Store.requiresOpenerSkill=false covers it) ---
  {
    name: 'Abby',
    links: [{ store: 'Ciao', tier: 'REGULAR' }],
    avail: { THURSDAY: [['10:00', '16:30']], SATURDAY: [['10:00', '16:30']] },
  },
  {
    name: 'Kai',
    links: [{ store: 'Ciao', tier: 'REGULAR' }],
    avail: { FRIDAY: [FULL_C], SATURDAY: [FULL_C] },
  },
  {
    name: 'Michael',
    links: [{ store: 'Ciao', tier: 'REGULAR' }],
    avail: { WEDNESDAY: [['10:00', '13:00']], THURSDAY: [['10:00', '16:30']], FRIDAY: [FULL_C] },
  },
  {
    name: 'Leo',
    links: [{ store: 'Ciao', tier: 'REGULAR' }],
    avail: { MONDAY: [FULL_C], WEDNESDAY: [['13:00', '22:30']], FRIDAY: [['14:00', '22:30']], SUNDAY: [FULL_C] },
  },
  // --- both stores ---
  {
    name: 'Cindy', // a trusted opener at Mango despite being a Regular, not tier-derived
    links: [
      { store: 'Mango', tier: 'REGULAR', canOpen: true },
      { store: 'Ciao', tier: 'REGULAR' },
    ],
    avail: { MONDAY: [FULL_B], TUESDAY: [FULL_B], WEDNESDAY: [FULL_B], FRIDAY: [FULL_B], SUNDAY: [FULL_B] },
  },
  {
    name: 'Daniel', // the owner/manager, works both stores
    links: [
      { store: 'Mango', tier: 'MANAGER', canOpen: true },
      { store: 'Ciao', tier: 'MANAGER' },
    ],
    avail: {
      WEDNESDAY: [['19:00', '23:30']], THURSDAY: [FULL_B], FRIDAY: [['18:00', '23:30']],
      SATURDAY: [FULL_B], SUNDAY: [FULL_B],
    },
  },
];

const MANGO_CLOSE: Partial<Record<Day, string>> = { FRIDAY: '23:00', SATURDAY: '23:00' };
const mangoClose = (day: Day) => MANGO_CLOSE[day] ?? '22:30';

const CIAO_CLOSE: Partial<Record<Day, string>> = { FRIDAY: '22:00', SATURDAY: '22:00' };
const ciaoClose = (day: Day) => CIAO_CLOSE[day] ?? '21:30';

async function main() {
  await prisma.shift.deleteMany();
  await prisma.recurringAvailability.deleteMany();
  await prisma.shiftRequirement.deleteMany();
  await prisma.employeeStore.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.store.deleteMany();

  const mango = await prisma.store.create({ data: { name: 'Mango' } });
  const ciao = await prisma.store.create({ data: { name: 'Ciao', requiresOpenerSkill: false } });
  const storeId = { Mango: mango.id, Ciao: ciao.id };

  let pin = 1000;
  for (const p of EMPLOYEES) {
    const emp = await prisma.employee.create({
      data: { name: p.name, hourLimit: 60, maxShifts: p.maxShifts ?? 6 },
    });
    for (const link of p.links) {
      pin += 1;
      await prisma.employeeStore.create({
        data: {
          employeeId: emp.id,
          storeId: storeId[link.store],
          pin: String(pin),
          proficiency: link.tier,
          canOpen: link.canOpen ?? false,
        },
      });
    }
    const availRows = Object.entries(p.avail).flatMap(([day, windows]) =>
      (windows ?? []).map(([start, end]) => ({ employeeId: emp.id, day: day as Day, start: t(start), end: t(end) })),
    );
    if (availRows.length) await prisma.recurringAvailability.createMany({ data: availRows });
  }

  const reqs: Array<{
    storeId: number; day: Day; start: Date; end: Date;
    managerRequired?: number; seniorRequired?: number; regularRequired?: number; newRequired?: number;
    needOpen?: boolean; graceMinutes?: number;
  }> = [];

  // night shifts: arriving up to an hour late is fine (matches scheduler_real.py)
  const NIGHT_GRACE = 60;

  for (const day of WEEKDAYS) {
    // opener block -- needs someone flagged canOpen, on time (no grace)
    reqs.push({ storeId: mango.id, day, start: t('11:30'), end: t('17:00'), regularRequired: 1, needOpen: true });

    // night: Thursday wants 2 seniors + a new; other weekdays just want a new allowed
    const nightEnd = mangoClose(day);
    const nHead = day === 'FRIDAY' ? 4 : 3;
    if (day === 'THURSDAY') {
      reqs.push({ storeId: mango.id, day, start: t('17:00'), end: t(nightEnd), seniorRequired: 2, newRequired: 1, graceMinutes: NIGHT_GRACE });
    } else {
      reqs.push({ storeId: mango.id, day, start: t('17:00'), end: t(nightEnd), regularRequired: nHead - 1, newRequired: 1, graceMinutes: NIGHT_GRACE });
    }
  }
  for (const day of ['SATURDAY', 'SUNDAY'] as const) {
    reqs.push({
      storeId: mango.id, day, start: t('11:30'), end: t(mangoClose(day)),
      seniorRequired: 1, regularRequired: 3, needOpen: true,
    });
  }
  for (const day of ALL_DAYS) {
    const head = day === 'FRIDAY' ? 2 : 1;
    reqs.push({ storeId: ciao.id, day, start: t('10:45'), end: t('16:00'), regularRequired: head });
    reqs.push({ storeId: ciao.id, day, start: t('16:00'), end: t(ciaoClose(day)), regularRequired: head, graceMinutes: NIGHT_GRACE });
  }

  await prisma.shiftRequirement.createMany({ data: reqs });

  const counts = {
    stores: await prisma.store.count(),
    employees: await prisma.employee.count(),
    employeeStores: await prisma.employeeStore.count(),
    availability: await prisma.recurringAvailability.count(),
    shiftRequirements: await prisma.shiftRequirement.count(),
  };
  console.log('seeded', counts);
  await prisma.$disconnect();
}

main();
