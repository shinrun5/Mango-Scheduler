// One-off bootstrap: create the first MANAGER account (there is no invite flow for
// managers). Needs the Supabase env vars in Backend/.env.
//
//   npm run create-manager -- <email> <password> [employeeNameToLink]
//
// e.g.  npm run create-manager -- daniel@example.com hunter2pw Daniel
//
// Safe to re-run: if the Supabase auth user already exists it's reused, and if the
// named employee is already linked to someone the account is created unlinked.

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

const admin = supabaseAdmin();

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.error(`A User with email ${email} already exists (id ${existing.id}, role ${existing.role}).`);
  process.exit(1);
}

// create the Supabase auth user, or reuse it if this is a re-run after a partial failure
let authId: string;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (created.data.user) {
  authId = created.data.user.id;
} else {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const match = data.users.find((u) => u.email === email);
  if (!match) {
    console.error('Supabase createUser failed:', created.error?.message ?? 'unknown error');
    process.exit(1);
  }
  console.error(`(auth user for ${email} already existed — reusing it; password left unchanged)`);
  authId = match.id;
}

// link the employee only if the name resolves AND isn't already taken
let employeeId: number | null = null;
if (employeeName) {
  const emp = await prisma.employee.findFirst({ where: { name: employeeName }, include: { user: true } });
  if (!emp) {
    console.error(`No employee named "${employeeName}" found — creating the manager without an employee link.`);
  } else if (emp.user) {
    console.error(`Employee "${employeeName}" is already linked to ${emp.user.email} — creating the manager unlinked.`);
  } else {
    employeeId = emp.id;
  }
}

try {
  const user = await prisma.user.create({
    data: { authId, email, role: 'MANAGER', employeeId },
  });
  console.log(
    `Created MANAGER user id ${user.id} (${email})` + (employeeId ? `, linked to employee ${employeeId}.` : '.'),
  );
  process.exit(0);
} catch (e) {
  // roll back a freshly-created auth user so the command can be retried cleanly
  if (created.data.user) await admin.auth.admin.deleteUser(authId).catch(() => {});
  console.error('Failed to create the User row:', e instanceof Error ? e.message : e);
  process.exit(1);
}
