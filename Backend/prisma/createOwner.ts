// Promote an account to OWNER of an org (creating the org if needed) and link
// every store in that org to them.
//
//   npm run create-owner -- <email> [orgName]
//
// If <email> is an existing User, they're promoted. Otherwise a new Supabase +
// User account is created (needs a password prompt is skipped — set it via the
// app's forgot-password once that exists, or use create-manager style flow).
//
// For the common case: the current single-manager account becomes the OWNER.

import prisma from '../src/lib/prisma.js';

const [email, orgNameArg] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run create-owner -- <email> [orgName]');
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No account for ${email}. Have them register first (or use create-manager), then re-run.`);
  process.exit(1);
}

// find or create the org: reuse the one the user already belongs to, else any
// existing single org, else make one.
let orgId = user.orgId ?? null;
if (orgId == null) {
  const existing = await prisma.org.findFirst({ orderBy: { id: 'asc' } });
  orgId = existing?.id ?? (await prisma.org.create({ data: { name: orgNameArg ?? 'My Company' } })).id;
}
if (orgNameArg) await prisma.org.update({ where: { id: orgId }, data: { name: orgNameArg } });

await prisma.user.update({ where: { id: user.id }, data: { role: 'OWNER', orgId } });
await prisma.org.update({ where: { id: orgId }, data: { ownerId: user.id } });

// every store in the org gets this owner as a manager (idempotent) + a Schedule row
const stores = await prisma.store.findMany({ where: { orgId } });
for (const s of stores) {
  await prisma.managerStore.upsert({
    where: { userId_storeId: { userId: user.id, storeId: s.id } },
    create: { userId: user.id, storeId: s.id },
    update: {},
  });
  await prisma.schedule.upsert({ where: { storeId: s.id }, create: { storeId: s.id }, update: {} });
}

console.log(
  `${email} is now OWNER of org ${orgId} (${stores.length} store${stores.length === 1 ? '' : 's'}).`,
);
process.exit(0);
