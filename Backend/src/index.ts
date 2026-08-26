import express from 'express';
import prisma from './lib/prisma.js';

const app = express();
const PORT = 3000;
app.use(express.json());

app.post('/employees', async (req, res) => {
  const { name, hourLimit} = req.body;
  const newEmployee = await prisma.employee.create({
    data: {
      name:  name,
      hourLimit: hourLimit,
    },
  });
  res.json(newEmployee);
});

app.get('/employees', async (req, res) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
});

app.post('/stores', async (req, res) => {
  const name = req.body.name;
  const newStore = await prisma.store.create({
    data: {
      name:  name,
    },
  });
  res.json(newStore);
});

app.get('/stores', async (req, res) => {
  const stores = await prisma.store.findMany();
  res.json(stores);
});

app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});