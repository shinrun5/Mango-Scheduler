import { Router, type NextFunction, type Request, type Response } from 'express';
import type { DayOfWeek } from '@prisma/client';
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

const clockIso = (hhmm: string) => `1970-01-01T${hhmm}:00.000Z`;
const minOf = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
const minHHMM = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

interface Coworker {
  name: string;
  avatarKey: number; // employeeId — feeds the deterministic default fruit
  avatarFruit: string | null;
}

// The signed-in employee's own shifts, per store.
//   - store's schedule is published  -> live Shift rows (marketplace actions work)
//   - a draft is in progress but the store has a posted snapshot -> that frozen
//     week, read-only ("live: false"), so workers keep seeing last posted week
//   - neither -> nothing
router.get('/mine', requireAuth, async (req, res) => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee" });

  const links = await prisma.employeeStore.findMany({
    where: { employeeId },
    include: { store: { include: { schedule: true } } },
  });

  const shiftsOut: {
    id: number;
    employeeId: number | null;
    storeId: number;
    day: DayOfWeek;
    start: string;
    end: string;
    coworkers: Coworker[];
  }[] = [];
  const stores: { storeId: number; storeName: string; publishedAt: Date | null; weekStart: Date | null; live: boolean }[] = [];
  let synthetic = 0;

  for (const l of links) {
    const sched = l.store.schedule;
    if (!sched) continue;

    if (sched.publishedAt) {
      const [rows, others] = await Promise.all([
        prisma.shift.findMany({
          where: { employeeId, storeId: l.storeId },
          orderBy: [{ day: 'asc' }, { start: 'asc' }],
        }),
        prisma.shift.findMany({
          where: { storeId: l.storeId, employeeId: { not: null, notIn: [employeeId] } },
          select: {
            employeeId: true,
            day: true,
            start: true,
            end: true,
            employee: { select: { name: true, avatarFruit: true } },
          },
        }),
      ]);
      for (const r of rows) {
        const mS = minOf(r.start);
        const mE = minOf(r.end);
        const coworkers: Coworker[] = others
          .filter((o) => o.day === r.day && overlaps(mS, mE, minOf(o.start), minOf(o.end)))
          .map((o) => ({
            name: o.employee?.name ?? 'A coworker',
            avatarKey: o.employeeId ?? 0,
            avatarFruit: o.employee?.avatarFruit ?? null,
          }));
        shiftsOut.push({
          id: r.id,
          employeeId: r.employeeId,
          storeId: r.storeId,
          day: r.day,
          start: r.start.toISOString(),
          end: r.end.toISOString(),
          coworkers,
        });
      }
      stores.push({
        storeId: l.storeId,
        storeName: l.store.name,
        publishedAt: sched.publishedAt,
        weekStart: sched.weekStart,
        live: true,
      });
    } else if (sched.postedSnapshotId) {
      const snap = await prisma.scheduleSnapshot.findUnique({ where: { id: sched.postedSnapshotId } });
      if (!snap) continue;
      const frozen = snap.shifts as {
        employeeId: number | null;
        employeeName: string | null;
        day: DayOfWeek;
        start: string;
        end: string;
      }[];
      // current fruit for anyone I might be working with
      const coworkerIds = [
        ...new Set(frozen.filter((f) => f.employeeId != null && f.employeeId !== employeeId).map((f) => f.employeeId!)),
      ];
      const fruitById = new Map(
        (
          await prisma.employee.findMany({
            where: { id: { in: coworkerIds } },
            select: { id: true, avatarFruit: true },
          })
        ).map((e) => [e.id, e.avatarFruit]),
      );
      for (const f of frozen) {
        if (f.employeeId !== employeeId) continue;
        const mS = minHHMM(f.start);
        const mE = minHHMM(f.end);
        const coworkers: Coworker[] = frozen
          .filter(
            (o) =>
              o.employeeId != null &&
              o.employeeId !== employeeId &&
              o.day === f.day &&
              overlaps(mS, mE, minHHMM(o.start), minHHMM(o.end)),
          )
          .map((o) => ({
            name: o.employeeName ?? 'A coworker',
            avatarKey: o.employeeId ?? 0,
            avatarFruit: fruitById.get(o.employeeId!) ?? null,
          }));
        shiftsOut.push({
          id: -++synthetic, // read-only; no marketplace actions in this state
          employeeId,
          storeId: l.storeId,
          day: f.day,
          start: clockIso(f.start),
          end: clockIso(f.end),
          coworkers,
        });
      }
      stores.push({
        storeId: l.storeId,
        storeName: l.store.name,
        publishedAt: snap.savedAt,
        weekStart: snap.weekStart,
        live: false,
      });
    }
  }

  shiftsOut.sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start));

  res.json({
    published: stores.length > 0,
    // marketplace is only offered when every shown store is on its live schedule
    live: stores.length > 0 && stores.every((s) => s.live),
    publishedAt: stores[0]?.publishedAt ?? null,
    weekStart: stores[0]?.weekStart ?? null,
    shifts: shiftsOut,
    stores,
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
