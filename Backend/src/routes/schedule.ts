import { Router, type Request } from 'express';
import { DayOfWeek } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireManagerFor } from '../lib/auth.js';
import { callSolver } from '../lib/solverClient.js';

const router = Router();

// storeId comes in the query on GETs, the body on writes
const storeIdFrom = (req: Request) => Number(req.query.storeId ?? req.body?.storeId);
const manageStore = requireManagerFor(storeIdFrom);

// The DateTime columns hold a wall-clock time (e.g. 11:30); read the clock face in UTC.
function toHHMM(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Midnight UTC of the Monday on or before `d`. */
function mondayUTC(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}

function parseYMD(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** One store's shift rows with denormalised names — the frozen form for a snapshot. */
async function freezeShifts(storeId: number) {
  const shifts = await prisma.shift.findMany({
    where: { storeId },
    include: { employee: true, store: true },
  });
  return shifts.map((s) => ({
    employeeId: s.employeeId,
    employeeName: s.employee?.name ?? null,
    storeId: s.storeId,
    storeName: s.store.name,
    day: s.day,
    start: toHHMM(s.start),
    end: toHHMM(s.end),
  }));
}

// --- one Schedule row per store ---

// GET /schedule/status?storeId=
router.get('/status', requireAuth, async (req, res) => {
  const storeId = Number(req.query.storeId);
  if (!Number.isInteger(storeId)) return res.status(400).json({ error: 'storeId is required' });
  if (!req.user!.storeIds.includes(storeId)) {
    return res.status(403).json({ error: 'No access to that store' });
  }
  const schedule = await prisma.schedule.findUnique({ where: { storeId } });
  res.json({
    publishedAt: schedule?.publishedAt ?? null,
    weekStart: schedule?.weekStart ?? mondayUTC(),
  });
});

router.post('/publish', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const schedule = await prisma.schedule.upsert({
    where: { storeId },
    create: { storeId, publishedAt: new Date(), publishedById: req.user!.id },
    update: { publishedAt: new Date(), publishedById: req.user!.id },
  });
  res.json({ publishedAt: schedule.publishedAt });
});

router.post('/unpublish', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const schedule = await prisma.schedule.upsert({
    where: { storeId },
    create: { storeId, publishedAt: null },
    update: { publishedAt: null },
  });
  res.json({ publishedAt: schedule.publishedAt });
});

// PUT /schedule/week  { storeId, weekStart: "YYYY-MM-DD" }
router.put('/week', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const parsed = parseYMD(req.body?.weekStart);
  if (!parsed) return res.status(400).json({ error: 'weekStart must be "YYYY-MM-DD"' });
  const weekStart = mondayUTC(parsed);
  const schedule = await prisma.schedule.upsert({
    where: { storeId },
    create: { storeId, weekStart },
    update: { weekStart },
  });
  res.json({ weekStart: schedule.weekStart });
});

// --- history (per-store frozen snapshots) ---

router.post('/snapshots', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const shifts = await freezeShifts(storeId);
  if (shifts.length === 0) {
    return res.status(400).json({ error: 'Nothing to save — this store has no shifts' });
  }
  const schedule = await prisma.schedule.findUnique({ where: { storeId } });
  const label =
    typeof req.body?.label === 'string' && req.body.label.trim() ? req.body.label.trim() : null;
  const snap = await prisma.scheduleSnapshot.create({
    data: { storeId, weekStart: schedule?.weekStart ?? mondayUTC(), label, savedById: req.user!.id, shifts },
  });
  res.status(201).json({
    id: snap.id,
    storeId: snap.storeId,
    weekStart: snap.weekStart,
    label: snap.label,
    savedAt: snap.savedAt,
    shiftCount: shifts.length,
  });
});

// GET /schedule/snapshots?storeId=&limit=
router.get('/snapshots', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const rows = await prisma.scheduleSnapshot.findMany({
    where: { storeId },
    orderBy: { savedAt: 'desc' },
    take: limit,
    select: { id: true, storeId: true, weekStart: true, label: true, savedAt: true },
  });
  res.json(rows);
});

// GET /schedule/snapshots/:id?storeId=
router.get('/snapshots/:id', ...manageStore, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const snap = await prisma.scheduleSnapshot.findUnique({ where: { id } });
  if (!snap || (snap.storeId !== null && !canManageStore(req.user, snap.storeId))) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(snap);
});

// POST /schedule/snapshots/:id/restore  { storeId }
router.post('/snapshots/:id/restore', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const snap = await prisma.scheduleSnapshot.findUnique({ where: { id } });
  if (!snap) return res.status(404).json({ error: 'Not found' });
  if (snap.storeId !== storeId) {
    return res.status(400).json({ error: 'That snapshot belongs to a different store' });
  }

  const frozen = snap.shifts as {
    employeeId: number | null;
    day: DayOfWeek;
    start: string;
    end: string;
  }[];
  const empIds = new Set((await prisma.employee.findMany({ select: { id: true } })).map((e) => e.id));

  const rows = frozen.map((f) => ({
    employeeId: f.employeeId && empIds.has(f.employeeId) ? f.employeeId : null,
    storeId,
    day: f.day,
    start: new Date(`1970-01-01T${f.start}:00.000Z`),
    end: new Date(`1970-01-01T${f.end}:00.000Z`),
  }));

  await prisma.$transaction([
    prisma.shift.deleteMany({ where: { storeId } }),
    prisma.shift.createMany({ data: rows }),
    prisma.schedule.upsert({
      where: { storeId },
      create: { storeId, weekStart: snap.weekStart, publishedAt: null },
      update: { weekStart: snap.weekStart, publishedAt: null },
    }),
  ]);
  res.json({ restored: rows.length, weekStart: snap.weekStart });
});

router.delete('/snapshots/:id', ...manageStore, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const snap = await prisma.scheduleSnapshot.findUnique({ where: { id } });
  if (!snap || (snap.storeId !== null && !canManageStore(req.user, snap.storeId))) {
    return res.status(404).json({ error: 'Not found' });
  }
  await prisma.scheduleSnapshot.delete({ where: { id } });
  res.json({ message: 'Snapshot deleted' });
});

/**
 * POST /schedule/generate  { storeId, solveSeconds?, replace?, saveFirst?, saveLabel? }
 * Solves one store: its requirements + the employees linked to it, writes that store's shifts.
 */
router.post('/generate', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const solveSeconds = Number(req.body?.solveSeconds ?? 5);
  const replace = req.body?.replace !== false;

  try {
    if (req.body?.saveFirst) {
      const existing = await freezeShifts(storeId);
      if (existing.length > 0) {
        const schedule = await prisma.schedule.findUnique({ where: { storeId } });
        await prisma.scheduleSnapshot.create({
          data: {
            storeId,
            weekStart: schedule?.weekStart ?? mondayUTC(),
            label:
              typeof req.body?.saveLabel === 'string' && req.body.saveLabel.trim()
                ? req.body.saveLabel.trim()
                : 'before regenerate',
            shifts: existing,
          },
        });
      }
    }

    const [store, employees, availability, requirements] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.employee.findMany({
        where: { standby: false, employeeStores: { some: { storeId } } },
        include: { employeeStores: { where: { storeId } } },
      }),
      prisma.recurringAvailability.findMany(),
      prisma.shiftRequirement.findMany({ where: { storeId } }),
    ]);

    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (requirements.length === 0) {
      return res.status(400).json({ error: 'This store has no shift requirements yet' });
    }

    const anyoneOpens = !store.requiresOpenerSkill;

    const payload = {
      solveSeconds,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        hourLimit: e.hourLimit,
        maxShifts: e.maxShifts,
        stores: e.employeeStores.map((es) => ({
          storeId: es.storeId,
          tier: es.proficiency,
          canOpen: es.canOpen || anyoneOpens,
          primary: es.primary,
        })),
      })),
      availability: availability.map((a) => ({
        employeeId: a.employeeId,
        day: a.day,
        start: toHHMM(a.start),
        end: toHHMM(a.end),
      })),
      requirements: requirements.map((r) => ({
        id: r.id,
        storeId: r.storeId,
        day: r.day,
        start: toHHMM(r.start),
        end: toHHMM(r.end),
        head: r.managerRequired + r.seniorRequired + r.regularRequired + r.newRequired,
        seniorMin: r.managerRequired + r.seniorRequired,
        needOpen: r.needOpen,
        graceMinutes: r.graceMinutes,
        allowNew: r.newRequired > 0,
      })),
    };

    const result = await callSolver(payload);
    if (!result.feasible) {
      return res.status(422).json({ error: 'Solver found no feasible schedule', result });
    }

    const reqById = new Map(requirements.map((r) => [r.id, r]));
    const rows = result.assignments.map((a) => {
      const r = reqById.get(a.requirementId)!;
      return { employeeId: a.employeeId, storeId: r.storeId, day: r.day, start: r.start, end: r.end };
    });

    const createOp = prisma.shift.createMany({ data: rows });
    await (replace
      ? prisma.$transaction([prisma.shift.deleteMany({ where: { storeId } }), createOp])
      : prisma.$transaction([createOp]));

    res.json({
      created: rows.length,
      optimal: result.optimal,
      objective: result.objective,
      unfilled: result.stats.unfilled ?? 0,
      spread: result.stats.spread ?? null,
      shiftsPerEmployee: result.stats.shiftsPerEmployee ?? {},
      gaps: result.gaps,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
