// Remove an account entirely: our User row + the Supabase auth user.
//
//   npm run delete-user -- <email>
//
// Use it to clear out test accounts. The linked Employee row is left alone
// (only the User <-> Employee link is dropped).

import prisma from '../src/lib/prisma.js';
import { supabaseAdmin } from '../src/lib/supabase.js';

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run delete-user -- <email>');
  process.exit(1);
}

const admin = supabaseAdmin();

const user = await prisma.user.findUnique({ where: { email } });
if (user) {
  await prisma.managerStore.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`deleted User id ${user.id} (${email})`);
} else {
  console.log(`no User row for ${email}`);
}

const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
const authUser = data.users.find((u) => u.email === email);
if (authUser) {
  await admin.auth.admin.deleteUser(authUser.id);
  console.log(`deleted Supabase auth user ${authUser.id}`);
} else {
  console.log(`no Supabase auth user for ${email}`);
}

process.exit(0);
