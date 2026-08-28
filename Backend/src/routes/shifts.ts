import { Router }  from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { employeeId, storeId, day, start, end } = req.body;
  const newShift = await prisma.shift.create({
    data: {
      employeeId,
      storeId,
      day,
      start,
      end
    },
  });
  res.json(newShift);
});

router.get('/', async (req, res) => {
  const shifts = await prisma.shift.findMany();
  res.json(shifts);
});

export default router;
