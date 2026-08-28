import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { employeeId, storeId, day, start, end } = req.body;

  if (!storeId || !day || !start || !end) {
    return res.status(400).json({ error: 'storeId, day, start, and end are required' });
  }

  try {
    const newShift = await prisma.shift.create({
      data: { employeeId, storeId, day, start, end },
    });
    res.json(newShift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

router.get('/', async (req, res) => {
  const shifts = await prisma.shift.findMany();
  res.json(shifts);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id },
    });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const shift = await prisma.shift.delete({
      where: { id },
    });
    res.json({ message: `Shift ${shift.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { employeeId, storeId, day, start, end } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const updatedShift = await prisma.shift.update({
      where: { id },
      data: { employeeId, storeId, day, start, end },
    });
    res.json(updatedShift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

export default router;