import { randomBytes } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import prisma from "../lib/prisma.js";
import { canManageStore, requireAuth, requireRole } from "../lib/auth.js";

const router = Router();
const anyManager = [requireAuth, requireRole("MANAGER", "OWNER")] as const;

/** Can this user manage this employee? OWNER: any in the org. MANAGER: any employee
 * linked to a store they run. */
async function canManageEmployee(req: Request, employeeId: number): Promise<boolean> {
  if (req.user?.role === "OWNER") return true;
  const link = await prisma.employeeStore.findFirst({
    where: { employeeId, storeId: { in: req.user?.storeIds ?? [] } },
    select: { employeeId: true },
  });
  return !!link;
}

/** Middleware wrapper around canManageEmployee for the /:id routes. */
async function requireManagerOfEmployee(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "A valid numeric id is required" });
  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (!(await canManageEmployee(req, id))) {
    return res.status(403).json({ error: "That worker isn't at one of your stores" });
  }
  next();
}

async function freePin(storeId: number): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const clash = await prisma.employeeStore.findUnique({ where: { storeId_pin: { storeId, pin } } });
    if (!clash) return pin;
  }
  throw new Error("Could not allocate a free PIN for this store");
}

interface RosterRow {
  id: number;
  name: string;
  hourLimit: number;
  maxShifts: number;
  standby: boolean;
  inviteCode: string | null;
  account: { email: string } | null;
  stores: { storeId: number; proficiency: string; canOpen: boolean; primary: boolean; pin: string }[];
}

/** The roster, optionally limited to employees linked to `storeIds`. */
async function roster(storeIds?: number[]): Promise<RosterRow[]> {
  const employees = await prisma.employee.findMany({
    ...(storeIds ? { where: { employeeStores: { some: { storeId: { in: storeIds } } } } } : {}),
    orderBy: { name: "asc" },
    include: { employeeStores: true, user: { select: { email: true } } },
  });
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    hourLimit: e.hourLimit,
    maxShifts: e.maxShifts,
    standby: e.standby,
    inviteCode: e.inviteCode,
    account: e.user ? { email: e.user.email } : null,
    stores: e.employeeStores.map((s) => ({
      storeId: s.storeId,
      proficiency: s.proficiency,
      canOpen: s.canOpen,
      primary: s.primary,
      pin: s.pin,
    })),
  }));
}

// GET /employees/roster — workers at the caller's stores (all, for an OWNER)
router.get("/roster", ...anyManager, async (req, res) => {
  res.json(await roster(req.user!.role === "OWNER" ? undefined : req.user!.storeIds));
});

// POST /employees/:id/invite
router.post("/:id/invite", requireAuth, requireManagerOfEmployee, async (req, res) => {
  const id = Number(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (employee.user) return res.status(409).json({ error: "This employee already has an account" });

  const inviteCode = randomBytes(9).toString("base64url");
  await prisma.employee.update({ where: { id }, data: { inviteCode } });
  res.json({ employeeId: id, inviteCode });
});

// POST /employees — create a worker, with a first store link (must manage that store)
router.post("/", ...anyManager, async (req, res) => {
  const { name, hourLimit, maxShifts, standby, store } = req.body ?? {};
  if (!name || hourLimit === undefined) {
    return res.status(400).json({ error: "name and hourLimit are required" });
  }
  const storeId = store?.storeId;
  if (storeId !== undefined) {
    if (!canManageStore(req.user, storeId)) {
      return res.status(403).json({ error: "You do not manage that store" });
    }
  } else if (req.user!.role !== "OWNER") {
    return res.status(400).json({ error: "Pick a store for this worker" });
  }

  try {
    const employee = await prisma.employee.create({
      data: { name, hourLimit, maxShifts: maxShifts ?? 6, standby: standby ?? false },
    });
    if (storeId && store?.proficiency) {
      await prisma.employeeStore.create({
        data: {
          employeeId: employee.id,
          storeId,
          pin: await freePin(storeId),
          proficiency: store.proficiency,
          canOpen: store.canOpen ?? false,
          primary: store.primary ?? true,
        },
      });
    }
    const rows = await roster();
    res.json(rows.find((r) => r.id === employee.id));
  } catch {
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const employees =
    req.user!.role === "OWNER"
      ? await prisma.employee.findMany()
      : await prisma.employee.findMany({
          where: { employeeStores: { some: { storeId: { in: req.user!.storeIds } } } },
        });
  res.json(employees);
});

router.get("/:id", requireAuth, requireManagerOfEmployee, async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
  res.json(employee);
});

router.put("/:id", requireAuth, requireManagerOfEmployee, async (req, res) => {
  const id = Number(req.params.id);
  const { name, hourLimit, maxShifts, standby } = req.body ?? {};
  if (!name || hourLimit === undefined) {
    return res.status(400).json({ error: "name and hourLimit are required" });
  }
  try {
    await prisma.employee.update({
      where: { id },
      data: {
        name,
        hourLimit,
        ...(maxShifts !== undefined ? { maxShifts } : {}),
        ...(standby !== undefined ? { standby } : {}),
      },
    });
    const rows = await roster();
    res.json(rows.find((r) => r.id === id));
  } catch {
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// DELETE /employees/:id — drops availability + store links + requests, frees shifts.
router.delete("/:id", requireAuth, requireManagerOfEmployee, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const employee = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await prisma.$transaction([
      prisma.shiftChangeRequest.deleteMany({ where: { requestedById: id } }),
      prisma.recurringAvailability.deleteMany({ where: { employeeId: id } }),
      prisma.employeeStore.deleteMany({ where: { employeeId: id } }),
      prisma.shift.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
      prisma.employee.delete({ where: { id } }),
    ]);

    res.json({
      message: `Employee ${employee.name} removed`,
      accountLeftUnlinked: employee.user?.email ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

export default router;
