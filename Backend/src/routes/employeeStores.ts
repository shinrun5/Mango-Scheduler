import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireManagerFor, requireRole } from '../lib/auth.js';

const router = Router();
const anyManager = [requireAuth, requireRole('MANAGER', 'OWNER')] as const;

// GET /employeeStores — links at stores the caller manages
router.get('/', ...anyManager, async (req, res) => {
  const links = await prisma.employeeStore.findMany({
    where: { storeId: { in: req.user!.storeIds } },
  });
  res.json(links);
});

router.get('/:employeeId/:storeId', ...anyManager, async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const storeId = Number(req.params.storeId);
  if (!Number.isInteger(employeeId) || !Number.isInteger(storeId)) {
    return res.status(400).json({ error: 'Valid numeric employeeId and storeId are required' });
  }
  if (!canManageStore(req.user, storeId)) return res.status(404).json({ error: 'Not found' });

  const link = await prisma.employeeStore.findUnique({
    where: { employeeId_storeId: { employeeId, storeId } },
  });
  res.json(link);
});

// POST /employeeStores  { employeeId, storeId, pin, proficiency, canOpen?, primary? }
router.post('/', ...requireManagerFor((req) => Number(req.body?.storeId)), async (req, res) => {
  const { employeeId, storeId, pin, proficiency, canOpen, primary } = req.body ?? {};
  if (!employeeId || !storeId || !pin || !proficiency) {
    return res.status(400).json({ error: 'employeeId, storeId, pin, and proficiency are required' });
  }
  try {
    const link = await prisma.employeeStore.create({
      data: {
        employeeId,
        storeId,
        pin,
        proficiency,
        ...(canOpen !== undefined ? { canOpen } : {}),
        ...(primary !== undefined ? { primary } : {}),
      },
    });
    res.json(link);
  } catch {
    res.status(500).json({ error: 'Failed to create employee-store link' });
  }
});

router.delete('/:employeeId/:storeId', ...anyManager, async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const storeId = Number(req.params.storeId);
  if (!Number.isInteger(employeeId) || !Number.isInteger(storeId)) {
    return res.status(400).json({ error: 'Valid numeric employeeId and storeId are required' });
  }
  if (!canManageStore(req.user, storeId)) return res.status(403).json({ error: 'You do not manage that store' });

  try {
    await prisma.employeeStore.delete({ where: { employeeId_storeId: { employeeId, storeId } } });
    res.json({ message: 'Employee-store link deleted successfully' });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

router.put('/:employeeId/:storeId', ...anyManager, async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const storeId = Number(req.params.storeId);
  const { pin, proficiency, canOpen, primary } = req.body ?? {};
  if (!Number.isInteger(employeeId) || !Number.isInteger(storeId)) {
    return res.status(400).json({ error: 'Valid numeric employeeId and storeId are required' });
  }
  if (!canManageStore(req.user, storeId)) return res.status(403).json({ error: 'You do not manage that store' });

  try {
    const link = await prisma.employeeStore.update({
      where: { employeeId_storeId: { employeeId, storeId } },
      data: {
        ...(pin !== undefined ? { pin } : {}),
        ...(proficiency !== undefined ? { proficiency } : {}),
        ...(canOpen !== undefined ? { canOpen } : {}),
        ...(primary !== undefined ? { primary } : {}),
      },
    });
    res.json(link);
  } catch {
    res.status(500).json({ error: 'Failed to update employee-store link' });
  }
});

export default router;
