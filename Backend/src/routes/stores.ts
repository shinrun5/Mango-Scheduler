import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();
const manager = [requireAuth, requireRole('MANAGER')] as const;

// POST /stores  (manager)  { name, requiresOpenerSkill? }
router.post('/', ...manager, async (req, res) => {
  const { name, requiresOpenerSkill } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const store = await prisma.store.create({
      data: { name, ...(requiresOpenerSkill !== undefined ? { requiresOpenerSkill } : {}) },
    });
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create store' });
  }
});

router.get('/', async (_req, res) => {
  const stores = await prisma.store.findMany({ orderBy: { name: 'asc' } });
  res.json(stores);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// PUT /stores/:id  (manager)  { name, requiresOpenerSkill? }
router.put('/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  const { name, requiresOpenerSkill } = req.body ?? {};

  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const store = await prisma.store.update({
      where: { id },
      data: { name, ...(requiresOpenerSkill !== undefined ? { requiresOpenerSkill } : {}) },
    });
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// DELETE /stores/:id  (manager) — refuses while anything still points at it
router.delete('/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const [links, reqs, shifts] = await Promise.all([
    prisma.employeeStore.count({ where: { storeId: id } }),
    prisma.shiftRequirement.count({ where: { storeId: id } }),
    prisma.shift.count({ where: { storeId: id } }),
  ]);
  if (links || reqs || shifts) {
    return res.status(409).json({
      error: 'Remove this store’s workers, shift requirements and shifts first',
    });
  }

  try {
    const store = await prisma.store.delete({ where: { id } });
    res.json({ message: `Store ${store.name} deleted` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

export default router;
