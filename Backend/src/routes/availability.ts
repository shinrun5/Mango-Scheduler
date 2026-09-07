import { Router } from 'express';
import { DayOfWeek } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();
const manager = [requireAuth, requireRole('MANAGER')] as const;

const DAYS = new Set<string>(Object.values(DayOfWeek));
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" -> the 1970-01-01 wall-clock DateTime the rest of the app stores. */
function toClock(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
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

router.get('/', async (req, res) => {
  const availability = await prisma.recurringAvailability.findMany();
  res.json(availability);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const availability = await prisma.recurringAvailability.findUnique({
      where: { id },
    });
    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
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
