import { Router, type Request } from 'express';
import { DayOfWeek } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { canManageStore, requireAuth, requireManagerFor } from '../lib/auth.js';
import { freezeShifts, generateScheduleForStore, mondayUTC } from '../lib/scheduleGen.js';

const router = Router();

// storeId comes in the query on GETs, the body on writes
const storeIdFrom = (req: Request) => Number(req.query.storeId ?? req.body?.storeId);
const manageStore = requireManagerFor(storeIdFrom);

function parseYMD(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const postedSnap = schedule?.postedSnapshotId
    ? await prisma.scheduleSnapshot.findUnique({
        where: { id: schedule.postedSnapshotId },
        select: { weekStart: true },
      })
    : null;
  res.json({
    publishedAt: schedule?.publishedAt ?? null,
    weekStart: schedule?.weekStart ?? mondayUTC(),
    // the week workers currently see (may lag the working week while a draft is in progress)
    postedWeekStart: postedSnap?.weekStart ?? null,
  });
});

router.post('/publish', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const existing = await prisma.schedule.findUnique({ where: { storeId } });
  const weekStart = existing?.weekStart ?? mondayUTC();

  // Freeze what workers will now see. Kept as the store's single 'posted' snapshot
  // (reused in place) so a later regenerate can't take this week away from them.
  const shifts = await freezeShifts(storeId);
  let postedSnapshotId = existing?.postedSnapshotId ?? null;
  if (postedSnapshotId) {
    const still = await prisma.scheduleSnapshot.findUnique({
      where: { id: postedSnapshotId },
      select: { id: true },
    });
    if (!still) postedSnapshotId = null;
  }
  if (postedSnapshotId) {
    await prisma.scheduleSnapshot.update({
      where: { id: postedSnapshotId },
      data: { shifts, weekStart, label: 'posted', savedAt: new Date(), savedById: req.user!.id },
    });
  } else {
    const snap = await prisma.scheduleSnapshot.create({
      data: { storeId, weekStart, label: 'posted', savedById: req.user!.id, shifts },
    });
    postedSnapshotId = snap.id;
  }

  const schedule = await prisma.schedule.upsert({
    where: { storeId },
    create: { storeId, publishedAt: new Date(), publishedById: req.user!.id, postedSnapshotId },
    update: { publishedAt: new Date(), publishedById: req.user!.id, postedSnapshotId },
  });
  res.json({ publishedAt: schedule.publishedAt });
});

router.post('/unpublish', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const existing = await prisma.schedule.findUnique({ where: { storeId } });
  const schedule = await prisma.schedule.upsert({
    where: { storeId },
    create: { storeId, publishedAt: null },
    update: { publishedAt: null, postedSnapshotId: null },
  });
  // taking it down means workers should see nothing — drop the frozen copy too
  if (existing?.postedSnapshotId) {
    await prisma.scheduleSnapshot.deleteMany({ where: { id: existing.postedSnapshotId } });
  }
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
    // the live 'posted' snapshot is the current schedule, not history — hide it
    where: { storeId, NOT: { label: 'posted' } },
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
 * Solves one store for whatever week its schedule points at. Draft only.
 */
router.post('/generate', ...manageStore, async (req, res) => {
  const storeId = storeIdFrom(req);
  const saveLabel =
    typeof req.body?.saveLabel === 'string' && req.body.saveLabel.trim()
      ? req.body.saveLabel.trim()
      : 'before regenerate';
  try {
    const r = await generateScheduleForStore(storeId, {
      solveSeconds: Number(req.body?.solveSeconds ?? 5),
      replace: req.body?.replace !== false,
      ...(req.body?.saveFirst ? { snapshotLabel: saveLabel } : {}),
    });
    if (!r.feasible) {
      return res.status(422).json({ error: 'Solver found no feasible schedule', result: r });
    }
    res.json({
      created: r.created,
      optimal: r.optimal,
      objective: r.objective,
      unfilled: r.unfilled,
      spread: r.spread,
      shiftsPerEmployee: r.shiftsPerEmployee,
      gaps: r.gaps,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
