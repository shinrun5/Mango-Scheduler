import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { employeeId, storeId, pin, proficiency } = req.body;

  if (!employeeId || !storeId || !pin || !proficiency) {
    return res.status(400).json({ error: 'employeeId, storeId, pin, and proficiency are required' });
  }

  try {
    const newEmployeeStore = await prisma.employeeStore.create({
      data: { employeeId, storeId, pin, proficiency },
    });
    res.json(newEmployeeStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create employee-store link' });
  }
});

router.get('/', async (req, res) => {
  const employeeStores = await prisma.employeeStore.findMany();
  res.json(employeeStores);
});

router.get('/:employeeId/:storeId', async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  const storeId = parseInt(req.params.storeId);

  if (isNaN(employeeId) || isNaN(storeId)) {
    return res.status(400).json({ error: 'Valid numeric employeeId and storeId are required' });
  }

  try {
    const employeeStore = await prisma.employeeStore.findUnique({
      where: { employeeId_storeId: { employeeId, storeId } },
    });
    res.json(employeeStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee-store link' });
  }
});

router.delete('/:employeeId/:storeId', async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  const storeId = parseInt(req.params.storeId);

  if (isNaN(employeeId) || isNaN(storeId)) {
    return res.status(400).json({ error: 'Valid numeric employeeId and storeId are required' });
  }

  try {
    await prisma.employeeStore.delete({
      where: { employeeId_storeId: { employeeId, storeId } },
    });
    res.json({ message: 'Employee-store link deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee-store link' });
  }
});

router.put('/:employeeId/:storeId', async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  const storeId = parseInt(req.params.storeId);
  const { pin, proficiency } = req.body;

  if (isNaN(employeeId) || isNaN(storeId)) {
    return res.status(400).json({ error: 'Valid numeric employeeId and storeId are required' });
  }

  try {
    const updatedEmployeeStore = await prisma.employeeStore.update({
      where: { employeeId_storeId: { employeeId, storeId } },
      data: { pin, proficiency },
    });
    res.json(updatedEmployeeStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee-store link' });
  }
});

export default router;