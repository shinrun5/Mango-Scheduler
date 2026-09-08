import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// GET /notifications — the caller's notifications (newest first) + unread count
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  res.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    })),
  });
});

// POST /notifications/:id/read
router.post('/:id/read', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const { count } = await prisma.notification.updateMany({
    where: { id, userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true, updated: count });
});

// POST /notifications/read-all
router.post('/read-all', requireAuth, async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true, updated: count });
});

export default router;
