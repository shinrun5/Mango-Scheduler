import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name, hourLimit } = req.body;
  const newEmployee = await prisma.employee.create({
    data: { name, hourLimit },
  });
  res.json(newEmployee);
});

router.get('/', async (req, res) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
});

export default router;