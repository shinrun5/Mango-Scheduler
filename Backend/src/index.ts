import express from 'express';
import prisma from './lib/prisma.js';

const app = express();
const PORT = 3000;

app.get('/employees', async (req, res) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
});

app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});