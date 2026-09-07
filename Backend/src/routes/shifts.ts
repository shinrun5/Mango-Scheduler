import { Router, type NextFunction, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireManagerFor, requireRole } from '../lib/auth.js';

const router = Router();
const anyManager = [requireAuth, requireRole('MANAGER', 'OWNER')] as const;

/** guard for PUT/DELETE /:id — the store isn't in the request, so load the shift first */
async function requireManagerOfShift(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const shift = await prisma.shift.findUnique({ where: { id }, select: { storeId: true } });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  if (!canManageStore(req.user, shift.storeId)) {
    return res.status(403).json({ error: 'You do not manage that store' });
  }
  next();
}

// The signed-in employee's own shifts, per store, each gated on that store being posted.
router.get('/mine', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const links = await prisma.employeeStore.findMany({
    where: { employeeId },
    include: { store: { include: { schedule: true } } },
  });

  const published = links.filter((l) => l.store.schedule?.publishedAt);
  const shifts = published.length
    ? await prisma.shift.findMany({
        where: { employeeId, storeId: { in: published.map((l) => l.storeId) } },
        orderBy: [{ day: 'asc' }, { start: 'asc' }],
      })
    : [];

  // union shape (kept simple for now); weekStart from any posted store
  res.json({
    published: published.length > 0,
    publishedAt: published[0]?.store.schedule?.publishedAt ?? null,
    weekStart: published[0]?.store.schedule?.weekStart ?? null,
    shifts,
    stores: published.map((l) => ({
      storeId: l.storeId,
      storeName: l.store.name,
      publishedAt: l.store.schedule?.publishedAt ?? null,
      weekStart: l.store.schedule?.weekStart ?? null,
    })),
  });
});

// Unassigned shifts the caller could pick up — at a posted store they work.
router.get('/open', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const links = await prisma.employeeStore.findMany({
    where: { employeeId },
    include: { store: { include: { schedule: true } } },
  });
  const postedStoreIds = links.filter((l) => l.store.schedule?.publishedAt).map((l) => l.storeId);
  if (postedStoreIds.length === 0) return res.json([]);

  const shifts = await prisma.shift.findMany({
    where: { employeeId: null, storeId: { in: postedStoreIds } },
    orderBy: [{ day: 'asc' }, { start: 'asc' }],
  });
  res.json(shifts);
});

// POST /shifts  { employeeId?, storeId, day, start, end }  (manager of that store)
router.post('/', ...requireManagerFor((req) => Number(req.body?.storeId)), async (req, res) => {
  const { employeeId, storeId, day, start, end } = req.body;
  if (!storeId || !day || !start || !end) {
    return res.status(400).json({ error: 'storeId, day, start, and end are required' });
  }
  try {
    const newShift = await prisma.shift.create({ data: { employeeId, storeId, day, start, end } });
    res.json(newShift);
  } catch {
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

router.get('/', ...anyManager, async (req, res) => {
  const shifts = await prisma.shift.findMany({ where: { storeId: { in: req.user!.storeIds } } });
  res.json(shifts);
});

router.get('/:id', ...anyManager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift || !req.user!.storeIds.includes(shift.storeId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(shift);
});

router.delete('/:id', requireAuth, requireManagerOfShift, async (req, res) => {
  try {
    const shift = await prisma.shift.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: `Shift ${shift.id} deleted successfully` });
  } catch {
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

router.put('/:id', requireAuth, requireManagerOfShift, async (req, res) => {
  const { employeeId, storeId, day, start, end } = req.body;
  try {
    const updatedShift = await prisma.shift.update({
      where: { id: Number(req.params.id) },
      data: { employeeId, storeId, day, start, end },
    });
    res.json(updatedShift);
  } catch {
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

export default router;
