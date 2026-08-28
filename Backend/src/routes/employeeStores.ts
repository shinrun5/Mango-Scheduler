import { Router }  from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { employeeId, storeId, pin, proficiency } = req.body;
  const newEmployeeStore = await prisma.employeeStore.create({
    data: {
      employeeId,
      storeId,
      pin,
      proficiency
    },
  });
  res.json(newEmployeeStore);
});

router.get('/', async (req, res) => {
  const employeeStores = await prisma.employeeStore.findMany();
  res.json(employeeStores);
});

export default router;