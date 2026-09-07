import { Router } from 'express';
import { DayOfWeek } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { callSolver } from '../lib/solverClient.js';

const router = Router();
const manager = [requireAuth, requireRole('MANAGER')] as const;

// The DateTime columns hold a wall-clock time (e.g. 11:30), so read the clock
// face in UTC and ignore the date part.
function toHHMM(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Midnight UTC of the Monday on or before `d`. */
function mondayUTC(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay(); // 0 = Sun
  x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}

function parseYMD(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Current shift rows with denormalised names — the frozen form stored in a snapshot. */
async function freezeShifts() {
  const shifts = await prisma.shift.findMany({ include: { employee: true, store: true } });
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

// --- publish state + calendar week (singleton row id = 1) ---
// Manager edits are always live once posted; publishedAt is the "employees may look"
// gate, weekStart is just the dates shown (shifts stay day-of-week templated).

router.get('/status', requireAuth, async (_req, res) => {
  const schedule = await prisma.schedule.findUnique({ where: { id: 1 } });
  res.json({
    publishedAt: schedule?.publishedAt ?? null,
    weekStart: schedule?.weekStart ?? mondayUTC(),
  });
});

router.post('/publish', ...manager, async (req, res) => {
  const schedule = await prisma.schedule.upsert({
    where: { id: 1 },
    create: { id: 1, publishedAt: new Date(), publishedById: req.user!.id },
    update: { publishedAt: new Date(), publishedById: req.user!.id },
  });
  res.json({ publishedAt: schedule.publishedAt });
});

router.post('/unpublish', ...manager, async (_req, res) => {
  const schedule = await prisma.schedule.upsert({
    where: { id: 1 },
    create: { id: 1, publishedAt: null },
    update: { publishedAt: null },
  });
  res.json({ publishedAt: schedule.publishedAt });
});

// PUT /schedule/week  { weekStart: "YYYY-MM-DD" }  — snapped to that day's Monday
router.put('/week', ...manager, async (req, res) => {
  const parsed = parseYMD(req.body?.weekStart);
  if (!parsed) return res.status(400).json({ error: 'weekStart must be "YYYY-MM-DD"' });
  const weekStart = mondayUTC(parsed);
  const schedule = await prisma.schedule.upsert({
    where: { id: 1 },
    create: { id: 1, weekStart },
    update: { weekStart },
  });
  res.json({ weekStart: schedule.weekStart });
});

// --- history (frozen snapshots) ---

// POST /schedule/snapshots  { label? }  — freeze the current schedule
router.post('/snapshots', ...manager, async (req, res) => {
  const shifts = await freezeShifts();
  if (shifts.length === 0) return res.status(400).json({ error: 'Nothing to save — the schedule is empty' });

  const schedule = await prisma.schedule.findUnique({ where: { id: 1 } });
  const label = typeof req.body?.label === 'string' && req.body.label.trim() ? req.body.label.trim() : null;
  const snap = await prisma.scheduleSnapshot.create({
    data: { weekStart: schedule?.weekStart ?? mondayUTC(), label, savedById: req.user!.id, shifts },
  });
  res.status(201).json({
    id: snap.id,
    weekStart: snap.weekStart,
    label: snap.label,
    savedAt: snap.savedAt,
    shiftCount: shifts.length,
  });
});

// GET /schedule/snapshots?limit=  — history list (no shift blob)
router.get('/snapshots', ...manager, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const rows = await prisma.scheduleSnapshot.findMany({
    orderBy: { savedAt: 'desc' },
    take: limit,
    select: { id: true, weekStart: true, label: true, savedAt: true },
  });
  res.json(rows);
});

// GET /schedule/snapshots/:id  — one snapshot with its frozen shifts
router.get('/snapshots/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const snap = await prisma.scheduleSnapshot.findUnique({ where: { id } });
  if (!snap) return res.status(404).json({ error: 'Not found' });
  res.json(snap);
});

// POST /schedule/snapshots/:id/restore  — replace the working schedule with this one
router.post('/snapshots/:id/restore', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  const snap = await prisma.scheduleSnapshot.findUnique({ where: { id } });
  if (!snap) return res.status(404).json({ error: 'Not found' });

  const frozen = snap.shifts as {
    employeeId: number | null;
    storeId: number;
    day: DayOfWeek;
    start: string;
    end: string;
  }[];

  const [emps, stores] = await Promise.all([
    prisma.employee.findMany({ select: { id: true } }),
    prisma.store.findMany({ select: { id: true } }),
  ]);
  const empIds = new Set(emps.map((e) => e.id));
  const storeIds = new Set(stores.map((s) => s.id));

  const rows = frozen
    .filter((f) => storeIds.has(f.storeId))
    .map((f) => ({
      employeeId: f.employeeId && empIds.has(f.employeeId) ? f.employeeId : null,
      storeId: f.storeId,
      day: f.day,
      start: new Date(`1970-01-01T${f.start}:00.000Z`),
      end: new Date(`1970-01-01T${f.end}:00.000Z`),
    }));

  await prisma.$transaction([
    prisma.shift.deleteMany({}),
    prisma.shift.createMany({ data: rows }),
    prisma.schedule.upsert({
      where: { id: 1 },
      create: { id: 1, weekStart: snap.weekStart, publishedAt: null },
      update: { weekStart: snap.weekStart, publishedAt: null },
    }),
  ]);

  res.json({ restored: rows.length, weekStart: snap.weekStart });
});

router.delete('/snapshots/:id', ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  try {
    await prisma.scheduleSnapshot.delete({ where: { id } });
    res.json({ message: 'Snapshot deleted' });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

/**
 * POST /schedule/generate
 * body: { solveSeconds?: number, replace?: boolean, saveFirst?: boolean, saveLabel?: string }
 *
 * Pulls employees / availability / shift requirements from the DB, asks the
 * Python solver for an assignment, and writes the result as Shift rows.
 * replace (default true) clears existing Shift rows first.
 * saveFirst freezes the current schedule to history before replacing it.
 */
router.post('/generate', ...manager, async (req, res) => {
  const solveSeconds = Number(req.body?.solveSeconds ?? 5);
  const replace = req.body?.replace !== false;

  try {
    if (req.body?.saveFirst) {
      const existing = await freezeShifts();
      if (existing.length > 0) {
        const schedule = await prisma.schedule.findUnique({ where: { id: 1 } });
        await prisma.scheduleSnapshot.create({
          data: {
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

    const [stores, employees, availability, requirements] = await Promise.all([
      prisma.store.findMany(),
      // standby (on-call) people are never auto-scheduled — the manager assigns them by hand
      prisma.employee.findMany({ where: { standby: false }, include: { employeeStores: true } }),
      prisma.recurringAvailability.findMany(),
      prisma.shiftRequirement.findMany(),
    ]);

    if (requirements.length === 0) {
      return res.status(400).json({ error: 'No shift requirements defined' });
    }

    // stores where opening isn't a gated skill -> everyone there counts as an opener
    const anyoneOpens = new Set(
      stores.filter((s) => !s.requiresOpenerSkill).map((s) => s.id),
    );

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
          canOpen: es.canOpen || anyoneOpens.has(es.storeId),
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
        head:
          r.managerRequired + r.seniorRequired + r.regularRequired + r.newRequired,
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
      return {
        employeeId: a.employeeId,
        storeId: r.storeId,
        day: r.day,
        start: r.start,
        end: r.end,
      };
    });

    const createOp = prisma.shift.createMany({ data: rows });
    await (replace
      ? prisma.$transaction([prisma.shift.deleteMany({}), createOp])
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
