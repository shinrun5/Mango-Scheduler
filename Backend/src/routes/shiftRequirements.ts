import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { storeId, day, start, end, managerRequired, seniorRequired, regularRequired, newRequired } = req.body;

  if (!storeId || !day || !start || !end) {
    return res.status(400).json({ error: 'storeId, day, start, and end are required' });
  }

  try {
    const newShiftRequirement = await prisma.shiftRequirement.create({
      data: { storeId, day, start, end, managerRequired, seniorRequired, regularRequired, newRequired },
    });
    res.json(newShiftRequirement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift requirement' });
  }
});

router.get('/', async (req, res) => {
  const shiftRequirements = await prisma.shiftRequirement.findMany();
  res.json(shiftRequirements);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const shiftRequirement = await prisma.shiftRequirement.findUnique({
      where: { id },
    });
    res.json(shiftRequirement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift requirement' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const shiftRequirement = await prisma.shiftRequirement.delete({
      where: { id },
    });
    res.json({ message: `Shift requirement ${shiftRequirement.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shift requirement' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { storeId, day, start, end, managerRequired, seniorRequired, regularRequired, newRequired } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const updatedShiftRequirement = await prisma.shiftRequirement.update({
      where: { id },
      data: { storeId, day, start, end, managerRequired, seniorRequired, regularRequired, newRequired },
    });
    res.json(updatedShiftRequirement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shift requirement' });
  }
});

export default router;