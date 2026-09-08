import { Router } from 'express';
import { DayOfWeek, Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();
const manager = [requireAuth, requireRole('MANAGER', 'OWNER')] as const;

const DAYS = new Set<string>(Object.values(DayOfWeek));
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" -> the 1970-01-01 wall-clock DateTime the rest of the app stores. */
function toClock(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

/** wall-clock DateTime -> "HH:MM" (UTC, matches toClock). */
function toHHMM(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" -> the Monday (UTC midnight) of that week, or null if unparseable. */
function parseWeekStart(q: unknown): Date | null {
  if (typeof q !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(q)) return null;
  const d = new Date(`${q}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return d;
}

interface Window {
  day: DayOfWeek;
  start: string;
  end: string;
}

/** Validate a { day, start:"HH:MM", end:"HH:MM" }[] body. Returns the cleaned list
 * or an error string. */
function cleanWindows(raw: unknown): Window[] | string {
  if (!Array.isArray(raw)) return 'windows must be an array';
  if (raw.length > 50) return 'Too many availability windows';
  const out: Window[] = [];
  for (const w of raw) {
    if (!DAYS.has(w?.day)) return `Invalid day: ${w?.day}`;
    if (!HHMM.test(w?.start) || !HHMM.test(w?.end)) return 'start and end must be "HH:MM"';
    if (w.start >= w.end) return 'start must be before end';
    out.push({ day: w.day, start: w.start, end: w.end });
  }
  return out;
}

// --- self-service: an employee's own weekly availability ---
// Placed before "/:id" so "mine" isn't parsed as an id.

router.get('/mine', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const windows = await prisma.recurringAvailability.findMany({
    where: { employeeId },
    orderBy: [{ day: 'asc' }, { start: 'asc' }],
  });
  res.json(windows);
});

/** Replace the caller's entire weekly availability in one shot.
 * body: { windows: { day, start: "HH:MM", end: "HH:MM" }[] } */
router.put('/mine', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const windows = req.body?.windows;
  if (!Array.isArray(windows)) return res.status(400).json({ error: 'windows must be an array' });
  if (windows.length > 50) return res.status(400).json({ error: 'Too many availability windows' });

  const rows: { employeeId: number; day: DayOfWeek; start: Date; end: Date }[] = [];
  for (const w of windows) {
    if (!DAYS.has(w?.day)) return res.status(400).json({ error: `Invalid day: ${w?.day}` });
    if (!HHMM.test(w?.start) || !HHMM.test(w?.end)) {
      return res.status(400).json({ error: 'start and end must be "HH:MM"' });
    }
    if (w.start >= w.end) return res.status(400).json({ error: 'start must be before end' });
    rows.push({ employeeId, day: w.day, start: toClock(w.start), end: toClock(w.end) });
  }

  await prisma.$transaction([
    prisma.recurringAvailability.deleteMany({ where: { employeeId } }),
    prisma.recurringAvailability.createMany({ data: rows }),
  ]);

  const saved = await prisma.recurringAvailability.findMany({
    where: { employeeId },
    orderBy: [{ day: 'asc' }, { start: 'asc' }],
  });
  res.json(saved);
});

// --- one-week override of the caller's standing availability ---

// GET /availability/mine/week?weekStart=YYYY-MM-DD
// Returns the override for that week if one exists, otherwise the standing set as
// a starting point (hasOverride=false).
router.get('/mine/week', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });
  const weekStart = parseWeekStart(req.query.weekStart);
  if (!weekStart) return res.status(400).json({ error: 'weekStart must be "YYYY-MM-DD"' });

  const row = await prisma.weekAvailability.findUnique({
    where: { employeeId_weekStart: { employeeId, weekStart } },
  });
  if (row) {
    return res.json({ weekStart: weekStart.toISOString().slice(0, 10), hasOverride: true, windows: row.windows as unknown as Window[] });
  }
  const standing = await prisma.recurringAvailability.findMany({
    where: { employeeId },
    orderBy: [{ day: 'asc' }, { start: 'asc' }],
  });
  res.json({
    weekStart: weekStart.toISOString().slice(0, 10),
    hasOverride: false,
    windows: standing.map((w) => ({ day: w.day, start: toHHMM(w.start), end: toHHMM(w.end) })),
  });
});

// PUT /availability/mine/week  { weekStart, windows: [{day,start,end}] }
router.put('/mine/week', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });
  const weekStart = parseWeekStart(req.body?.weekStart);
  if (!weekStart) return res.status(400).json({ error: 'weekStart must be "YYYY-MM-DD"' });
  const windows = cleanWindows(req.body?.windows);
  if (typeof windows === 'string') return res.status(400).json({ error: windows });

  await prisma.weekAvailability.upsert({
    where: { employeeId_weekStart: { employeeId, weekStart } },
    create: { employeeId, weekStart, windows: windows as unknown as Prisma.InputJsonValue },
    update: { windows: windows as unknown as Prisma.InputJsonValue },
  });
  res.json({ weekStart: weekStart.toISOString().slice(0, 10), hasOverride: true, windows });
});

// DELETE /availability/mine/week?weekStart=YYYY-MM-DD  — revert that week to standing
router.delete('/mine/week', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });
  const weekStart = parseWeekStart(req.query.weekStart);
  if (!weekStart) return res.status(400).json({ error: 'weekStart must be "YYYY-MM-DD"' });
  await prisma.weekAvailability.deleteMany({ where: { employeeId, weekStart } });
  res.json({ ok: true });
});

// GET /availability/week?weekStart=YYYY-MM-DD  (manager) — every override for that
// week, for employees at the caller's stores. Flattened to {employeeId,day,start,end}.
router.get('/week', ...manager, async (req, res) => {
  const weekStart = parseWeekStart(req.query.weekStart);
  if (!weekStart) return res.status(400).json({ error: 'weekStart must be "YYYY-MM-DD"' });
  const rows = await prisma.weekAvailability.findMany({
    where: {
      weekStart,
      employee: { employeeStores: { some: { storeId: { in: req.user!.storeIds } } } },
    },
  });
  const flat: { employeeId: number; day: string; start: string; end: string }[] = [];
  for (const r of rows) {
    for (const w of r.windows as unknown as Window[]) {
      flat.push({ employeeId: r.employeeId, day: w.day, start: w.start, end: w.end });
    }
  }
  res.json({ overriddenEmployeeIds: rows.map((r) => r.employeeId), windows: flat });
});

router.post('/', ...manager, async (req, res) => {
  const { employeeId, day, start, end } = req.body;

  if (!employeeId || !day || !start || !end) {
    return res.status(400).json({ error: 'employeeId, day, start, and end are required' });
  }

  try {
    const newAvailability = await prisma.recurringAvailability.create({
      data: { employeeId, day, start, end },
    });
    res.json(newAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create availability' });
  }
});

// GET /availability — windows for employees at stores the caller manages (used by
// the manager board's candidate picker). Managers/owners only.
router.get('/', ...manager, async (req, res) => {
  const availability = await prisma.recurringAvailability.findMany({
    where: { employee: { employeeStores: { some: { storeId: { in: req.user!.storeIds } } } } },
  });
  res.json(availability);
});

router.get('/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const row = await prisma.recurringAvailability.findUnique({
    where: { id },
    include: { employee: { select: { employeeStores: { select: { storeId: true } } } } },
  });
  if (!row || !row.employee.employeeStores.some((es) => req.user!.storeIds.includes(es.storeId))) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(row);
});

router.delete('/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const availability = await prisma.recurringAvailability.delete({
      where: { id },
    });
    res.json({ message: `Availability ${availability.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete availability' });
  }
});

router.put('/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  const { employeeId, day, start, end } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const updatedAvailability = await prisma.recurringAvailability.update({
      where: { id },
      data: { employeeId, day, start, end },
    });
    res.json(updatedAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;
