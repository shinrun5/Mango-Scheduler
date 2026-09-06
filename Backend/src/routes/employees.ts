import { randomBytes } from "node:crypto";
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// POST /employees/:id/invite  (manager only)
// Issues a fresh single-use code the employee uses at POST /auth/register to
// claim their account. Regenerating replaces any unclaimed code.
router.post("/:id/invite", requireAuth, requireRole("MANAGER"), async (req, res) => {
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

router.post("/", async (req, res) => {
  const { name, hourLimit } = req.body;

  if (!name || hourLimit === undefined) {
    return res.status(400).json({ error: "name and hourLimit are required" });
  }

  try {
    const newEmployee = await prisma.employee.create({
      data: { name, hourLimit },
    });
    res.json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.get("/", async (req, res) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: id },
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const employee = await prisma.employee.delete({
      where: { id: id },
    });
    res.json({ message: `Employee ${employee.name} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, hourLimit } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "A valid numeric id is required" });
  }
  if (!name || hourLimit === undefined) {
    return res.status(400).json({ error: "name and hourLimit are required" });
  }

  try {
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: { name, hourLimit },
    });
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: "Failed to update employee" });
  }
});

export default router;
