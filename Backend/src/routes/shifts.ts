import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// The signed-in employee's own shifts -- but only once the schedule is posted.
// Placed before "/:id" so "mine" isn't parsed as an id.
router.get('/mine', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const schedule = await prisma.schedule.findUnique({ where: { id: 1 } });
  if (!schedule?.publishedAt) {
    return res.json({ published: false, publishedAt: null, shifts: [] });
  }

  const shifts = await prisma.shift.findMany({
    where: { employeeId },
    orderBy: [{ day: 'asc' }, { start: 'asc' }],
  });
  res.json({ published: true, publishedAt: schedule.publishedAt, shifts });
});

// Unassigned shifts the caller could pick up (at a store they work, once posted).
router.get('/open', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const schedule = await prisma.schedule.findUnique({ where: { id: 1 } });
  if (!schedule?.publishedAt) return res.json([]);

  const links = await prisma.employeeStore.findMany({ where: { employeeId }, select: { storeId: true } });
  const shifts = await prisma.shift.findMany({
    where: { employeeId: null, storeId: { in: links.map((l) => l.storeId) } },
    orderBy: [{ day: 'asc' }, { start: 'asc' }],
  });
  res.json(shifts);
});

router.post('/', async (req, res) => {
  const { employeeId, storeId, day, start, end } = req.body;

  if (!storeId || !day || !start || !end) {
    return res.status(400).json({ error: 'storeId, day, start, and end are required' });
  }

  try {
    const newShift = await prisma.shift.create({
      data: { employeeId, storeId, day, start, end },
    });
    res.json(newShift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

router.get('/', async (req, res) => {
  const shifts = await prisma.shift.findMany();
  res.json(shifts);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id },
    });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const shift = await prisma.shift.delete({
      where: { id },
    });
    res.json({ message: `Shift ${shift.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { employeeId, storeId, day, start, end } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const updatedShift = await prisma.shift.update({
      where: { id },
      data: { employeeId, storeId, day, start, end },
    });
    res.json(updatedShift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

export default router;