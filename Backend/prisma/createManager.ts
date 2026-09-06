// One-off bootstrap: create the first MANAGER account (there is no invite flow for
// managers). Needs the Supabase env vars in Backend/.env.
//
//   npm run create-manager -- <email> <password> [employeeNameToLink]
//
// e.g.  npm run create-manager -- daniel@example.com hunter2pw Daniel

import prisma from '../src/lib/prisma.js';
import { supabaseAdmin } from '../src/lib/supabase.js';

const [email, password, employeeName] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: npm run create-manager -- <email> <password> [employeeNameToLink]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.error(`A User with email ${email} already exists (id ${existing.id}, role ${existing.role}).`);
  process.exit(1);
}

const created = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
if (created.error || !created.data.user) {
  console.error('Supabase createUser failed:', created.error?.message ?? 'unknown error');
  process.exit(1);
}

let employeeId: number | null = null;
if (employeeName) {
  const emp = await prisma.employee.findFirst({ where: { name: employeeName } });
  if (!emp) {
    console.error(`No employee named "${employeeName}" found — creating the manager without an employee link.`);
  } else {
    employeeId = emp.id;
  }
}

const user = await prisma.user.create({
  data: { authId: created.data.user.id, email, role: 'MANAGER', employeeId },
});

console.log(
  `Created MANAGER user id ${user.id} (${email})` + (employeeId ? `, linked to employee ${employeeId}.` : '.'),
);
process.exit(0);
