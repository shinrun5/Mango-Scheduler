import { Router }  from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req, res) => {
  const name = req.body.name;
  const newStore = await prisma.store.create({
    data: {
      name:  name,
    },
  });
  res.json(newStore);
});

router.get('/', async (req, res) => {
  const stores = await prisma.store.findMany();
  res.json(stores);
});

export default router; 