import { Router }  from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { storeId, day, start, end, managerRequired, seniorRequired, regularRequired, newRequired } = req.body;
  const newShiftRequirement = await prisma.shiftRequirement.create({
    data: {
      storeId,
      day,
      start,
      end,
      managerRequired,
      seniorRequired,
      regularRequired,
      newRequired,
    },
  });
  res.json(newShiftRequirement);
});

router.get('/', async (req, res) => {
  const shiftRequirements = await prisma.shiftRequirement.findMany();
  res.json(shiftRequirements);
});

export default router; 