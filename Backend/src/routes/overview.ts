import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireOwner } from '../lib/auth.js';

const router = Router();

const hours = (start: Date, end: Date) => (end.getTime() - start.getTime()) / 3_600_000;

// GET /overview — one row per store in the owner's org, for the portfolio view.
router.get('/', ...requireOwner, async (req, res) => {
  const orgId = req.user!.orgId;
  if (orgId == null) return res.status(400).json({ error: 'Your account has no org' });

  const stores = await prisma.store.findMany({
    where: { orgId },
    orderBy: { name: 'asc' },
    include: {
      schedule: true,
      shifts: true,
      shiftRequirement: true,
    },
  });

  const storeIds = stores.map((s) => s.id);
  const pending = await prisma.shiftChangeRequest.findMany({
    where: { status: 'PENDING', shift: { storeId: { in: storeIds } } },
    include: { shift: { select: { storeId: true } } },
  });

  const rows = stores.map((s) => {
    const assigned = s.shifts.filter((sh) => sh.employeeId !== null);
    const openShifts = s.shifts.length - assigned.length;
    const staffHours = assigned.reduce((n, sh) => n + hours(sh.start, sh.end), 0);

    // rough coverage shortfall: per requirement, head minus assigned shifts overlapping its window
    let gapCount = 0;
    for (const r of s.shiftRequirement) {
      const head = r.managerRequired + r.seniorRequired + r.regularRequired + r.newRequired;
      const covering = assigned.filter(
        (sh) => sh.day === r.day && sh.start < r.end && r.start < sh.end,
      ).length;
      gapCount += Math.max(0, head - covering);
    }

    const pendingRequests = pending.filter(
      (p) =>
        p.shift.storeId === s.id &&
        !(p.openOffer && p.targetEmployeeId === null), // unclaimed offers aren't actionable
    ).length;

    return {
      storeId: s.id,
      name: s.name,
      publishedAt: s.schedule?.publishedAt ?? null,
      weekStart: s.schedule?.weekStart ?? null,
      shiftCount: s.shifts.length,
      openShifts,
      staffHours: Math.round(staffHours),
      requirementCount: s.shiftRequirement.length,
      gapCount,
      pendingRequests,
    };
  });

  res.json({ stores: rows });
});

export default router;
