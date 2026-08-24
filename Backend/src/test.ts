import prisma from './lib/prisma.js';

async function main() {
  const newEmployee = await prisma.employee.create({
    data: {
      name: 'Test Employee',
      hourLimit: 20,
    },
  });
  console.log('Created:', newEmployee);

  const employees = await prisma.employee.findMany();
  console.log('All employees:', employees);
}

main();