import { randomBytes } from "node:crypto";
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();
const manager = [requireAuth, requireRole("MANAGER")] as const;

/** A random 4-digit PIN that isn't taken at this store yet. */
async function freePin(storeId: number): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const clash = await prisma.employeeStore.findUnique({
      where: { storeId_pin: { storeId, pin } },
    });
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

async function roster(): Promise<RosterRow[]> {
  const employees = await prisma.employee.findMany({
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

// GET /employees/roster  (manager) — the full worker list with store links + account status
router.get("/roster", ...manager, async (_req, res) => {
  res.json(await roster());
});

// POST /employees/:id/invite  (manager) — issue a single-use sign-up code
router.post("/:id/invite", ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "A valid numeric id is required" });
  }

  const employee = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (employee.user) return res.status(409).json({ error: "This employee already has an account" });

  const inviteCode = randomBytes(9).toString("base64url");
  await prisma.employee.update({ where: { id }, data: { inviteCode } });
  res.json({ employeeId: id, inviteCode });
});

// POST /employees  (manager) — create a worker, optionally with a first store link
router.post("/", ...manager, async (req, res) => {
  const { name, hourLimit, maxShifts, standby, store } = req.body ?? {};
  if (!name || hourLimit === undefined) {
    return res.status(400).json({ error: "name and hourLimit are required" });
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        hourLimit,
        maxShifts: maxShifts ?? 6,
        standby: standby ?? false,
      },
    });

    if (store?.storeId && store?.proficiency) {
      await prisma.employeeStore.create({
        data: {
          employeeId: employee.id,
          storeId: store.storeId,
          pin: await freePin(store.storeId),
          proficiency: store.proficiency,
          canOpen: store.canOpen ?? false,
          primary: store.primary ?? true,
        },
      });
    }

    const rows = await roster();
    res.json(rows.find((r) => r.id === employee.id));
  } catch (error) {
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.get("/", async (_req, res) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "A valid numeric id is required" });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// PUT /employees/:id  (manager)
router.put("/:id", ...manager, async (req, res) => {
  const id = Number(req.params.id);
  const { name, hourLimit, maxShifts, standby } = req.body ?? {};

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "A valid numeric id is required" });
  }
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
  } catch (error) {
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// DELETE /employees/:id  (manager) — drops availability + store links, frees any
// shifts (employeeId -> null so the slot shows as a gap). An existing account is
// left in place but unlinked (delete it with `npm run delete-user`).
router.delete("/:id", ...manager, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "A valid numeric id is required" });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await prisma.$transaction([
      prisma.recurringAvailability.deleteMany({ where: { employeeId: id } }),
      prisma.employeeStore.deleteMany({ where: { employeeId: id } }),
      prisma.shift.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
      prisma.employee.delete({ where: { id } }),
    ]);

    res.json({
      message: `Employee ${employee.name} removed`,
      accountLeftUnlinked: employee.user?.email ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

export default router;
