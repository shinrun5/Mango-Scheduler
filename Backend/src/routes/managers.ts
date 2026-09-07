import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireOwner } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

interface PersonRow {
  id: number;
  email: string;
  role: 'OWNER' | 'MANAGER';
  storeIds: number[];
  isEmployee: boolean;
  isSelf: boolean;
}

async function people(orgId: number, selfId: number): Promise<PersonRow[]> {
  const users = await prisma.user.findMany({
    where: { orgId, role: { in: ['OWNER', 'MANAGER'] } },
    orderBy: [{ role: 'asc' }, { email: 'asc' }], // OWNER sorts before MANAGER
    include: { managerStores: { select: { storeId: true } } },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role as 'OWNER' | 'MANAGER',
    storeIds: u.managerStores.map((m) => m.storeId),
    isEmployee: u.employeeId != null,
    isSelf: u.id === selfId,
  }));
}

/** Keep only storeIds that belong to this org. */
async function orgStoreIds(orgId: number): Promise<Set<number>> {
  return new Set(
    (await prisma.store.findMany({ where: { orgId }, select: { id: true } })).map((s) => s.id),
  );
}

// GET /managers  (owner) — every owner + manager in the org
router.get('/', ...requireOwner, async (req, res) => {
  res.json({ people: await people(req.user!.orgId!, req.user!.id) });
});

// POST /managers/owners  { email, password }  (owner) — add a co-owner
router.post('/owners', ...requireOwner, async (req, res) => {
  const orgId = req.user!.orgId!;
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const created = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    return res.status(400).json({ error: created.error?.message ?? 'Could not create the account' });
  }
  try {
    const user = await prisma.user.create({
      data: { authId: created.data.user.id, email, role: 'OWNER', orgId },
    });
    res.status(201).json({
      id: user.id,
      email,
      role: 'OWNER',
      storeIds: [],
      isEmployee: false,
      isSelf: false,
    });
  } catch {
    await supabaseAdmin().auth.admin.deleteUser(created.data.user.id).catch(() => {});
    res.status(500).json({ error: 'Failed to create the owner' });
  }
});

// POST /managers/:id/role  { role: 'OWNER' | 'MANAGER' }  (owner) — promote / hand over
router.post('/:id/role', ...requireOwner, async (req, res) => {
  const orgId = req.user!.orgId!;
  const id = Number(req.params.id);
  const role = req.body?.role;
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  if (role !== 'OWNER' && role !== 'MANAGER') {
    return res.status(400).json({ error: "role must be 'OWNER' or 'MANAGER'" });
  }

  const target = await prisma.user.findFirst({
    where: { id, orgId, role: { in: ['OWNER', 'MANAGER'] } },
  });
  if (!target) return res.status(404).json({ error: 'Not found in your org' });
  if (target.role === role) return res.json({ id, role });

  if (target.role === 'OWNER' && role === 'MANAGER') {
    const owners = await prisma.user.count({ where: { orgId, role: 'OWNER' } });
    if (owners <= 1) return res.status(400).json({ error: 'The company needs at least one owner' });
  }

  await prisma.user.update({ where: { id }, data: { role } });

  // a freshly demoted owner has no store assignments — give them all org stores to start
  if (target.role === 'OWNER' && role === 'MANAGER') {
    const stores = await prisma.store.findMany({ where: { orgId }, select: { id: true } });
    await prisma.$transaction([
      prisma.managerStore.deleteMany({ where: { userId: id } }),
      prisma.managerStore.createMany({ data: stores.map((s) => ({ userId: id, storeId: s.id })) }),
    ]);
  }
  res.json({ id, role });
});

// POST /managers  { email, password, storeIds: number[] }  (owner)
router.post('/', ...requireOwner, async (req, res) => {
  const orgId = req.user!.orgId!;
  const { email, password, storeIds } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const valid = await orgStoreIds(orgId);
  const stores: number[] = Array.isArray(storeIds) ? storeIds.filter((s: number) => valid.has(s)) : [];

  const created = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    return res.status(400).json({ error: created.error?.message ?? 'Could not create the account' });
  }

  try {
    const user = await prisma.user.create({
      data: {
        authId: created.data.user.id,
        email,
        role: 'MANAGER',
        orgId,
        managerStores: { create: stores.map((storeId) => ({ storeId })) },
      },
    });
    res.status(201).json({ id: user.id, email, storeIds: stores, isEmployee: false });
  } catch {
    await supabaseAdmin().auth.admin.deleteUser(created.data.user.id).catch(() => {});
    res.status(500).json({ error: 'Failed to create the manager' });
  }
});

// PUT /managers/:id/stores  { storeIds: number[] }  (owner)
router.put('/:id/stores', ...requireOwner, async (req, res) => {
  const orgId = req.user!.orgId!;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });

  const target = await prisma.user.findFirst({ where: { id, orgId, role: 'MANAGER' } });
  if (!target) return res.status(404).json({ error: 'Manager not found' });

  const valid = await orgStoreIds(orgId);
  const stores: number[] = Array.isArray(req.body?.storeIds)
    ? req.body.storeIds.filter((s: number) => valid.has(s))
    : [];

  await prisma.$transaction([
    prisma.managerStore.deleteMany({ where: { userId: id } }),
    prisma.managerStore.createMany({ data: stores.map((storeId) => ({ userId: id, storeId })) }),
  ]);
  res.json({ id, storeIds: stores });
});

// DELETE /managers/:id  (owner) — removes the login; an Employee record is left intact
router.delete('/:id', ...requireOwner, async (req, res) => {
  const orgId = req.user!.orgId!;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'A valid numeric id is required' });
  if (id === req.user!.id) return res.status(400).json({ error: "You can't remove yourself" });

  const target = await prisma.user.findFirst({
    where: { id, orgId, role: { in: ['OWNER', 'MANAGER'] } },
  });
  if (!target) return res.status(404).json({ error: 'Not found in your org' });
  if (target.role === 'OWNER') {
    const owners = await prisma.user.count({ where: { orgId, role: 'OWNER' } });
    if (owners <= 1) return res.status(400).json({ error: 'The company needs at least one owner' });
  }

  await prisma.managerStore.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  await supabaseAdmin().auth.admin.deleteUser(target.authId).catch(() => {});
  res.json({ message: 'Manager removed' });
});

export default router;
