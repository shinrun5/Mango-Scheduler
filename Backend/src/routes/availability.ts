import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { employeeId, day, start, end } = req.body;

  if (!employeeId || !day || !start || !end) {
    return res.status(400).json({ error: 'employeeId, day, start, and end are required' });
  }

  try {
    const newAvailability = await prisma.recurringAvailability.create({
      data: { employeeId, day, start, end },
    });
    res.json(newAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create availability' });
  }
});

router.get('/', async (req, res) => {
  const availability = await prisma.recurringAvailability.findMany();
  res.json(availability);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const availability = await prisma.recurringAvailability.findUnique({
      where: { id },
    });
    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const availability = await prisma.recurringAvailability.delete({
      where: { id },
    });
    res.json({ message: `Availability ${availability.id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete availability' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { employeeId, day, start, end } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const updatedAvailability = await prisma.recurringAvailability.update({
      where: { id },
      data: { employeeId, day, start, end },
    });
    res.json(updatedAvailability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;
