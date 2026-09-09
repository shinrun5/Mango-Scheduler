import { Router, type Request } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { notify } from '../lib/notify.js';

const router = Router();

const MAX_LEN = 2000;
const PAGE = 50;
// don't email a given person about chat more than once per this window
const EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

interface WireMessage {
  id: number;
  storeId: number;
  body: string;
  createdAt: string;
  authorName: string;
  /** stable per-person key for the deterministic default avatar (employeeId, else userId) */
  authorKey: number;
  authorFruit: string | null;
  mine: boolean;
}

function toWire(
  m: { id: number; storeId: number; body: string; createdAt: Date; authorName: string; userId: number | null },
  meUserId: number,
  keyFruit: Map<number, { key: number; fruit: string | null }>,
): WireMessage {
  const kf = m.userId != null ? keyFruit.get(m.userId) : undefined;
  return {
    id: m.id,
    storeId: m.storeId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    authorName: m.authorName,
    authorKey: kf?.key ?? m.userId ?? 0,
    authorFruit: kf?.fruit ?? null,
    mine: m.userId === meUserId,
  };
}

/** employeeId (for the deterministic fruit) + chosen avatarFruit, keyed by userId. */
async function avatarLookup(userIds: number[]): Promise<Map<number, { key: number; fruit: string | null }>> {
  const ids = [...new Set(userIds.filter((n) => n > 0))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, employeeId: true, employee: { select: { avatarFruit: true } } },
  });
  return new Map(
    users.map((u) => [u.id, { key: u.employeeId ?? u.id, fruit: u.employee?.avatarFruit ?? null }]),
  );
}

const canSee = (req: Request, storeId: number) =>
  Number.isInteger(storeId) && !!req.user?.storeIds.includes(storeId);

// GET /chat/:storeId/messages?after=<id>&before=<id>
// no cursor -> the latest page; `after` -> everything newer (polling);
// `before` -> the page just older (scroll-back). Always returned oldest-first.
router.get('/:storeId/messages', requireAuth, async (req, res) => {
  const storeId = Number(req.params.storeId);
  if (!canSee(req, storeId)) return res.status(403).json({ error: 'Not your store' });

  const after = req.query.after !== undefined ? Number(req.query.after) : null;
  const before = req.query.before !== undefined ? Number(req.query.before) : null;

  let rows;
  if (after != null && Number.isFinite(after)) {
    rows = await prisma.message.findMany({
      where: { storeId, deletedAt: null, id: { gt: after } },
      orderBy: { id: 'asc' },
      take: 200,
    });
  } else {
    rows = await prisma.message.findMany({
      where: { storeId, deletedAt: null, ...(before != null && Number.isFinite(before) ? { id: { lt: before } } : {}) },
      orderBy: { id: 'desc' },
      take: PAGE,
    });
    rows.reverse();
  }

  const keyFruit = await avatarLookup(rows.map((r) => r.userId ?? 0));
  res.json({
    messages: rows.map((r) => toWire(r, req.user!.id, keyFruit)),
    hasMore: after == null && rows.length === PAGE,
  });
});

// POST /chat/:storeId/messages  { body }
router.post('/:storeId/messages', requireAuth, async (req, res) => {
  const storeId = Number(req.params.storeId);
  if (!canSee(req, storeId)) return res.status(403).json({ error: 'Not your store' });

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) return res.status(400).json({ error: 'Message is empty' });
  if (body.length > MAX_LEN) return res.status(400).json({ error: `Message is too long (max ${MAX_LEN})` });

  const me = req.user!;
  const authorName = me.name ?? me.email;
  const msg = await prisma.message.create({
    data: { storeId, userId: me.id, authorName, body },
  });
  // the sender has now "seen" everything up to their own message
  await prisma.messageRead.upsert({
    where: { userId_storeId: { userId: me.id, storeId } },
    create: { userId: me.id, storeId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  void emailChatRecipients(storeId, me.id, authorName, body).catch((e) =>
    console.error('[chat] recipient email failed', e),
  );

  const keyFruit = await avatarLookup([me.id]);
  res.status(201).json({ message: toWire(msg, me.id, keyFruit) });
});

// POST /chat/:storeId/read — mark the whole channel read up to now
router.post('/:storeId/read', requireAuth, async (req, res) => {
  const storeId = Number(req.params.storeId);
  if (!canSee(req, storeId)) return res.status(403).json({ error: 'Not your store' });
  const now = new Date();
  await prisma.messageRead.upsert({
    where: { userId_storeId: { userId: req.user!.id, storeId } },
    create: { userId: req.user!.id, storeId, lastReadAt: now },
    update: { lastReadAt: now },
  });
  res.json({ ok: true });
});

// GET /chat/unread — unread counts for every store the caller belongs to
router.get('/unread', requireAuth, async (req, res) => {
  const storeIds = req.user!.storeIds;
  if (storeIds.length === 0) return res.json({ total: 0, byStore: {} });

  const reads = await prisma.messageRead.findMany({
    where: { userId: req.user!.id, storeId: { in: storeIds } },
  });
  const readAt = new Map(reads.map((r) => [r.storeId, r.lastReadAt]));

  const byStore: Record<number, number> = {};
  let total = 0;
  for (const storeId of storeIds) {
    const since = readAt.get(storeId);
    const n = await prisma.message.count({
      where: {
        storeId,
        deletedAt: null,
        userId: { not: req.user!.id },
        ...(since ? { createdAt: { gt: since } } : {}),
      },
    });
    if (n > 0) byStore[storeId] = n;
    total += n;
  }
  res.json({ total, byStore });
});

/** Everyone who belongs to a store's chat: its employees, its managers, the org owner. */
async function storeMemberUserIds(storeId: number): Promise<number[]> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { orgId: true } });
  if (!store) return [];
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'OWNER', orgId: store.orgId },
        { managerStores: { some: { storeId } } },
        { employee: { is: { employeeStores: { some: { storeId } } } } },
      ],
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** Email opted-in members (except the sender) that the chat has new activity, at
 * most once per EMAIL_COOLDOWN_MS each. Coarse on purpose — a nudge, not a relay. */
async function emailChatRecipients(
  storeId: number,
  senderUserId: number,
  senderName: string,
  body: string,
): Promise<void> {
  const memberIds = (await storeMemberUserIds(storeId)).filter((id) => id !== senderUserId);
  if (memberIds.length === 0) return;

  const cutoff = new Date(Date.now() - EMAIL_COOLDOWN_MS);
  const recipients = await prisma.user.findMany({
    where: {
      id: { in: memberIds },
      notifyOnChatMessage: true,
      OR: [{ lastChatEmailAt: null }, { lastChatEmailAt: { lt: cutoff } }],
    },
    select: { id: true },
  });
  if (recipients.length === 0) return;

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
  const preview = body.length > 140 ? `${body.slice(0, 140)}…` : body;
  await prisma.user.updateMany({
    where: { id: { in: recipients.map((r) => r.id) } },
    data: { lastChatEmailAt: new Date() },
  });
  for (const r of recipients) {
    await notify(r.id, {
      kind: 'GENERIC',
      title: `New messages in ${store?.name ?? 'store'} chat`,
      body: `${senderName}: ${preview}`,
      link: '/chat',
      email: true,
    });
  }
}

export default router;
