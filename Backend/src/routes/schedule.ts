import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { callSolver } from '../lib/solverClient.js';

const router = Router();

// The DateTime columns hold a wall-clock time (e.g. 11:30), so read the clock
// face in UTC and ignore the date part.
function toHHMM(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * POST /schedule/generate
 * body: { solveSeconds?: number, replace?: boolean }
 *
 * Pulls employees / availability / shift requirements from the DB, asks the
 * Python solver for an assignment, and writes the result as Shift rows.
 * replace (default true) clears existing Shift rows first.
 */
router.post('/generate', async (req, res) => {
  const solveSeconds = Number(req.body?.solveSeconds ?? 5);
  const replace = req.body?.replace !== false;

  try {
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
