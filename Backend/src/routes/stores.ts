import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireOwner } from '../lib/auth.js';

const router = Router();

// POST /stores  (owner)  { name, requiresOpenerSkill? } — created in the owner's org,
// with an empty Schedule row and the owner as a manager
router.post('/', ...requireOwner, async (req, res) => {
  const { name, requiresOpenerSkill, pairNewWorkers } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (req.user!.orgId == null) return res.status(400).json({ error: 'Your account has no org' });

  try {
    const store = await prisma.store.create({
      data: {
        name,
        orgId: req.user!.orgId,
        ...(requiresOpenerSkill !== undefined ? { requiresOpenerSkill } : {}),
        ...(pairNewWorkers !== undefined ? { pairNewWorkers } : {}),
        schedule: { create: {} },
        managers: { create: { userId: req.user!.id } },
      },
    });
    res.json(store);
  } catch {
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// GET /stores — the stores the caller can see
router.get('/', requireAuth, async (req, res) => {
  const stores = await prisma.store.findMany({
    where: { id: { in: req.user!.storeIds } },
    orderBy: { name: 'asc' },
  });
  res.json(stores);
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  if (!req.user!.storeIds.includes(id)) return res.status(404).json({ error: 'Not found' });
  const store = await prisma.store.findUnique({ where: { id } });
  res.json(store);
});

// PUT /stores/:id  (owner or a manager of it)  { name, requiresOpenerSkill? }
router.put('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, requiresOpenerSkill, pairNewWorkers } = req.body ?? {};
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  if (!canManageStore(req.user, id)) return res.status(403).json({ error: 'You do not manage that store' });
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        ...(requiresOpenerSkill !== undefined ? { requiresOpenerSkill } : {}),
        ...(pairNewWorkers !== undefined ? { pairNewWorkers } : {}),
      },
    });
    res.json(store);
  } catch {
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// DELETE /stores/:id  (owner) — refuses while anything still points at it
router.delete('/:id', ...requireOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  if (!req.user!.storeIds.includes(id)) return res.status(404).json({ error: 'Not found' });

  const [links, reqs, shifts] = await Promise.all([
    prisma.employeeStore.count({ where: { storeId: id } }),
    prisma.shiftRequirement.count({ where: { storeId: id } }),
    prisma.shift.count({ where: { storeId: id } }),
  ]);
  if (links || reqs || shifts) {
    return res
      .status(409)
      .json({ error: 'Remove this store’s workers, shift requirements and shifts first' });
  }

  try {
    await prisma.$transaction([
      prisma.scheduleSnapshot.deleteMany({ where: { storeId: id } }),
      prisma.schedule.deleteMany({ where: { storeId: id } }),
      prisma.managerStore.deleteMany({ where: { storeId: id } }),
      prisma.store.delete({ where: { id } }),
    ]);
    res.json({ message: 'Store deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

export default router;
