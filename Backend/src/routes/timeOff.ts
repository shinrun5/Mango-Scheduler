import { Router, type NextFunction, type Request, type Response } from 'express';
import { TimeOffStatus } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireRole } from '../lib/auth.js';

const router = Router();
const anyManager = [requireAuth, requireRole('MANAGER', 'OWNER')] as const;

const DAY_MS = 86_400_000;
const MIN_DAYS = 7; // a request must span at least a week
const LEAD_DAYS = 7; // and be filed at least a week before it starts

/** "YYYY-MM-DD" -> that date at UTC midnight, or null. */
function parseDate(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function shape(r: {
  id: number;
  employeeId: number;
  startDate: Date;
  endDate: Date;
  note: string | null;
  status: TimeOffStatus;
  createdAt: Date;
  employee?: { name: string };
}) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employee?.name ?? null,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    note: r.note,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Load the request and check the caller manages a store the employee works at. */
async function requireManagerOfTimeOff(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const row = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: { employee: { select: { employeeStores: { select: { storeId: true } } } } },
  });
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!row.employee.employeeStores.some((es) => canManageStore(req.user, es.storeId))) {
    return res.status(403).json({ error: "That worker isn't at one of your stores" });
  }
  next();
}

// GET /time-off/mine — the caller's own requests, newest first
router.get('/mine', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });
  const rows = await prisma.timeOffRequest.findMany({
    where: { employeeId },
    orderBy: { startDate: 'desc' },
  });
  res.json(rows.map(shape));
});

// POST /time-off  { startDate, endDate, note? } — file a vacation request
router.post('/', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const start = parseDate(req.body?.startDate);
  const end = parseDate(req.body?.endDate);
  if (!start || !end) return res.status(400).json({ error: 'startDate and endDate must be "YYYY-MM-DD"' });
  if (end < start) return res.status(400).json({ error: 'End date is before the start date' });

  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (days < MIN_DAYS) {
    return res.status(400).json({ error: 'Time off has to be at least a week long' });
  }
  const earliest = new Date(todayUTC().getTime() + LEAD_DAYS * DAY_MS);
  if (start < earliest) {
    return res.status(400).json({ error: 'File it at least a week before it starts' });
  }

  const clash = await prisma.timeOffRequest.findFirst({
    where: {
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (clash) return res.status(409).json({ error: 'You already have time off that overlaps those dates' });

  const note = typeof req.body?.note === 'string' ? req.body.note.trim() || null : null;
  const row = await prisma.timeOffRequest.create({
    data: { employeeId, startDate: start, endDate: end, note },
  });
  res.status(201).json(shape(row));
});

// DELETE /time-off/:id — cancel your own request (while pending, or approved but
// not started yet)
router.delete('/:id', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  const id = Number(req.params.id);
  if (!employeeId || !Number.isInteger(id)) return res.status(400).json({ error: 'Bad request' });
  const row = await prisma.timeOffRequest.findUnique({ where: { id } });
  if (!row || row.employeeId !== employeeId) return res.status(404).json({ error: 'Not found' });
  if (row.status === 'DENIED' || row.status === 'CANCELLED') {
    return res.status(400).json({ error: 'That request is already closed' });
  }
  if (row.status === 'APPROVED' && row.startDate <= todayUTC()) {
    return res.status(400).json({ error: "That time off has started — talk to your manager" });
  }
  await prisma.timeOffRequest.update({ where: { id }, data: { status: 'CANCELLED', resolvedAt: new Date() } });
  res.json({ ok: true });
});

// GET /time-off?status=PENDING  (manager) — requests for workers at their stores
router.get('/', ...anyManager, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : null;
  const rows = await prisma.timeOffRequest.findMany({
    where: {
      employee: { employeeStores: { some: { storeId: { in: req.user!.storeIds } } } },
      ...(status && status in TimeOffStatus ? { status: status as TimeOffStatus } : {}),
    },
    include: { employee: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
  });
  res.json(rows.map(shape));
});

// POST /time-off/:id/approve  |  /deny  (manager of a store the worker's at)
for (const action of ['approve', 'deny'] as const) {
  router.post(`/:id/${action}`, requireAuth, requireManagerOfTimeOff, async (req, res) => {
    const id = Number(req.params.id);
    const row = await prisma.timeOffRequest.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'PENDING') return res.status(409).json({ error: 'Already resolved' });
    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'DENIED',
        resolvedAt: new Date(),
        resolvedById: req.user!.id,
      },
      include: { employee: { select: { name: true } } },
    });
    res.json(shape(updated));
  });
}

export default router;
