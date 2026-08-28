import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const newStore = await prisma.store.create({
      data: { name },
    });
    res.json(newStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create store' });
  }
});

router.get('/', async (req, res) => {
  const stores = await prisma.store.findMany();
  res.json(stores);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id },
    });
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }

  try {
    const store = await prisma.store.delete({
      where: { id },
    });
    res.json({ message: `Store ${store.name} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'A valid numeric id is required' });
  }
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const updatedStore = await prisma.store.update({
      where: { id },
      data: { name },
    });
    res.json(updatedStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store' });
  }
});

export default router;