import { Router, type NextFunction, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireRole } from '../lib/auth.js';

const router = Router();
const anyManager = [requireAuth, requireRole('MANAGER', 'OWNER')] as const;

/** guard for approve/deny — the request's shift must be at a store the caller manages */
async function requireManagerOfRequest(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const r = await prisma.shiftChangeRequest.findUnique({
    where: { id },
    include: { shift: { select: { storeId: true } } },
  });
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canManageStore(req.user, r.shift.storeId)) {
    return res.status(403).json({ error: 'You do not manage that store' });
  }
  next();
}

const INCLUDE = { shift: true, requestedBy: true, targetEmployee: true } as const;
type FullRequest = Prisma.ShiftChangeRequestGetPayload<{ include: typeof INCLUDE }>;

/** Flatten a request + its relations into the shape the frontend uses. */
function shape(r: FullRequest) {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    openOffer: r.openOffer,
    note: r.note,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    shift: {
      id: r.shift.id,
      storeId: r.shift.storeId,
      day: r.shift.day,
      start: r.shift.start,
      end: r.shift.end,
      employeeId: r.shift.employeeId,
    },
    requestedBy: { id: r.requestedBy.id, name: r.requestedBy.name },
    targetEmployee: r.targetEmployee ? { id: r.targetEmployee.id, name: r.targetEmployee.name } : null,
  };
}

async function linkExists(employeeId: number, storeId: number) {
  return prisma.employeeStore.findUnique({ where: { employeeId_storeId: { employeeId, storeId } } });
}

// GET /change-requests/swap-targets?shiftId=  -- coworkers at that shift's store
router.get('/swap-targets', requireAuth, async (req, res) => {
  const me = req.user?.employeeId ?? -1;
  const shiftId = Number(req.query.shiftId);
  if (!Number.isInteger(shiftId)) return res.status(400).json({ error: 'shiftId is required' });

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  // must be your shift, or at a store you work
  if (shift.employeeId !== me && !(await linkExists(me, shift.storeId))) {
    return res.status(403).json({ error: 'Not your shift' });
  }

  const links = await prisma.employeeStore.findMany({
    where: { storeId: shift.storeId, employeeId: { not: me } },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { employee: { name: 'asc' } },
  });
  res.json(links.map((l) => ({ id: l.employee.id, name: l.employee.name })));
});

// GET /change-requests/mine  -- the caller's own requests
router.get('/mine', requireAuth, async (req, res) => {
  const me = req.user?.employeeId;
  if (!me) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const rows = await prisma.shiftChangeRequest.findMany({
    where: { requestedById: me },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
  res.json(rows.map(shape));
});

// GET /change-requests/marketplace  -- open offers to claim + the caller's own posts
router.get('/marketplace', requireAuth, async (req, res) => {
  const me = req.user?.employeeId;
  if (!me) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const myStoreIds = (
    await prisma.employeeStore.findMany({ where: { employeeId: me }, select: { storeId: true } })
  ).map((s) => s.storeId);

  const [open, claimed, posted] = await Promise.all([
    prisma.shiftChangeRequest.findMany({
      where: {
        type: 'SWAP',
        openOffer: true,
        status: 'PENDING',
        targetEmployeeId: null,
        requestedById: { not: me },
        shift: { storeId: { in: myStoreIds } },
      },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    }),
    prisma.shiftChangeRequest.findMany({
      where: { type: 'SWAP', openOffer: true, status: 'PENDING', targetEmployeeId: me },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    }),
    prisma.shiftChangeRequest.findMany({
      where: { type: 'SWAP', openOffer: true, status: 'PENDING', requestedById: me },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    }),
  ]);
  res.json({ available: open.map(shape), claimed: claimed.map(shape), posted: posted.map(shape) });
});

// POST /change-requests  { type, shiftId, targetEmployeeId?, note? }  (employee)
router.post('/', requireAuth, async (req, res) => {
  const me = req.user?.employeeId;
  if (!me) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const { type, shiftId, targetEmployeeId, note } = req.body ?? {};
  if (!['DROP', 'SWAP', 'PICKUP'].includes(type)) {
    return res.status(400).json({ error: 'type must be DROP, SWAP or PICKUP' });
  }
  if (!Number.isInteger(shiftId)) return res.status(400).json({ error: 'shiftId is required' });

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  const openPending = await prisma.shiftChangeRequest.findFirst({ where: { shiftId, status: 'PENDING' } });
  if (openPending) return res.status(409).json({ error: 'There is already a pending request for this shift' });

  let target: number | null = null;
  let openOffer = false;

  if (type === 'DROP' || type === 'SWAP') {
    if (shift.employeeId !== me) return res.status(403).json({ error: 'That is not your shift' });
  }
  if (type === 'SWAP') {
    if (targetEmployeeId === undefined || targetEmployeeId === null) {
      openOffer = true; // posted to the marketplace — no target until a coworker claims it
    } else {
      if (!Number.isInteger(targetEmployeeId)) {
        return res.status(400).json({ error: 'targetEmployeeId must be a number' });
      }
      if (!(await linkExists(targetEmployeeId, shift.storeId))) {
        return res.status(400).json({ error: "That coworker doesn't work at this store" });
      }
      target = targetEmployeeId;
    }
  }
  if (type === 'PICKUP') {
    if (shift.employeeId !== null) return res.status(409).json({ error: 'That shift is already assigned' });
    if (!(await linkExists(me, shift.storeId))) {
      return res.status(400).json({ error: "You don't work at this store" });
    }
  }

  const created = await prisma.shiftChangeRequest.create({
    data: { type, shiftId, requestedById: me, targetEmployeeId: target, openOffer, note: note ?? null },
    include: INCLUDE,
  });
  res.status(201).json(shape(created));
});

// POST /change-requests/:id/cancel  (the requester, while still pending)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const me = req.user?.employeeId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const r = await prisma.shiftChangeRequest.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.requestedById !== me) return res.status(403).json({ error: 'Not your request' });
  if (r.status !== 'PENDING') return res.status(409).json({ error: 'That request is already resolved' });

  const updated = await prisma.shiftChangeRequest.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: INCLUDE,
  });
  res.json(shape(updated));
});

// POST /change-requests/:id/claim  -- a coworker claims an open marketplace offer
router.post('/:id/claim', requireAuth, async (req, res) => {
  const me = req.user?.employeeId;
  if (!me) return res.status(400).json({ error: "Your account isn't linked to an employee" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const r = await prisma.shiftChangeRequest.findUnique({ where: { id }, include: { shift: true } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!(r.type === 'SWAP' && r.openOffer) || r.status !== 'PENDING') {
    return res.status(409).json({ error: "That offer isn't open" });
  }
  if (r.targetEmployeeId) return res.status(409).json({ error: 'Someone already claimed that shift' });
  if (r.requestedById === me) return res.status(400).json({ error: "That's your own shift" });
  if (!(await linkExists(me, r.shift.storeId))) {
    return res.status(400).json({ error: "You don't work at this store" });
  }

  const sameDay = await prisma.shift.findMany({ where: { employeeId: me, day: r.shift.day } });
  if (sameDay.some((s) => s.start < r.shift.end && r.shift.start < s.end)) {
    return res.status(409).json({ error: "You're already working then" });
  }

  const updated = await prisma.shiftChangeRequest.update({
    where: { id },
    data: { targetEmployeeId: me },
    include: INCLUDE,
  });
  res.json(shape(updated));
});

// POST /change-requests/:id/unclaim  -- the claimer backs out (offer goes back on the board)
router.post('/:id/unclaim', requireAuth, async (req, res) => {
  const me = req.user?.employeeId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const r = await prisma.shiftChangeRequest.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.targetEmployeeId !== me) return res.status(403).json({ error: "You haven't claimed that" });
  if (r.status !== 'PENDING') return res.status(409).json({ error: 'That request is already resolved' });

  const updated = await prisma.shiftChangeRequest.update({
    where: { id },
    data: { targetEmployeeId: null },
    include: INCLUDE,
  });
  res.json(shape(updated));
});

// GET /change-requests?status=PENDING  (manager/owner — only their stores' requests)
router.get('/', ...anyManager, async (req, res) => {
  const status = req.query.status;
  const valid = ['PENDING', 'APPROVED', 'DENIED', 'CANCELLED'];
  const where: Prisma.ShiftChangeRequestWhereInput = {
    shift: { storeId: { in: req.user!.storeIds } },
    ...(typeof status === 'string' && valid.includes(status) ? { status: status as never } : {}),
  };

  const rows = await prisma.shiftChangeRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
  res.json(rows.map(shape));
});

// POST /change-requests/:id/approve  (manager) — re-validates, then mutates the Shift
router.post('/:id/approve', requireAuth, requireManagerOfRequest, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const r = await prisma.shiftChangeRequest.findUnique({ where: { id }, include: { shift: true } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.status !== 'PENDING') return res.status(409).json({ error: 'That request is already resolved' });

  if ((r.type === 'DROP' || r.type === 'SWAP') && r.shift.employeeId !== r.requestedById) {
    return res.status(409).json({ error: 'The requester no longer holds this shift' });
  }
  if (r.type === 'PICKUP' && r.shift.employeeId !== null) {
    return res.status(409).json({ error: 'That shift is no longer open' });
  }

  const newEmployeeId =
    r.type === 'DROP' ? null : r.type === 'SWAP' ? r.targetEmployeeId : r.requestedById;

  await prisma.$transaction([
    prisma.shift.update({ where: { id: r.shiftId }, data: { employeeId: newEmployeeId } }),
    prisma.shiftChangeRequest.update({
      where: { id },
      data: { status: 'APPROVED', resolvedAt: new Date(), resolvedById: req.user!.id },
    }),
  ]);

  const updated = await prisma.shiftChangeRequest.findUnique({ where: { id }, include: INCLUDE });
  res.json(shape(updated!));
});

// POST /change-requests/:id/deny  (manager)
router.post('/:id/deny', requireAuth, requireManagerOfRequest, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const r = await prisma.shiftChangeRequest.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.status !== 'PENDING') return res.status(409).json({ error: 'That request is already resolved' });

  // denying a claimed marketplace offer just clears the claim -- it stays on the board
  if (r.openOffer && r.targetEmployeeId) {
    const back = await prisma.shiftChangeRequest.update({
      where: { id },
      data: { targetEmployeeId: null },
      include: INCLUDE,
    });
    return res.json(shape(back));
  }

  const updated = await prisma.shiftChangeRequest.update({
    where: { id },
    data: { status: 'DENIED', resolvedAt: new Date(), resolvedById: req.user!.id },
    include: INCLUDE,
  });
  res.json(shape(updated));
});

export default router;
