import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { supabaseAdmin, supabaseAnon } from '../lib/supabase.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

function publicUser(u: { id: number; email: string; role: string; employeeId: number | null }) {
  return { id: u.id, email: u.email, role: u.role, employeeId: u.employeeId };
}

// POST /auth/register  { email, password, inviteCode }
// An Employee row must already exist with a matching, unclaimed inviteCode
// (a manager issues it). Registration creates the Supabase auth user, links a
// User row to that Employee, and consumes the code.
router.post('/register', async (req, res) => {
  const { email, password, inviteCode } = req.body ?? {};
  if (!email || !password || !inviteCode) {
    return res.status(400).json({ error: 'email, password, and inviteCode are required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const employee = await prisma.employee.findUnique({
    where: { inviteCode },
    include: { user: true },
  });
  if (!employee) return res.status(400).json({ error: 'Invalid invite code' });
  if (employee.user) return res.status(409).json({ error: 'This invite has already been claimed' });

  // email_confirm: true — we deliberately skip email verification for now
  const created = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    return res.status(400).json({ error: created.error?.message ?? 'Could not create account' });
  }

  try {
    const user = await prisma.user.create({
      data: { authId: created.data.user.id, email, role: 'EMPLOYEE', employeeId: employee.id },
    });
    await prisma.employee.update({ where: { id: employee.id }, data: { inviteCode: null } });

    const signIn = await supabaseAnon().auth.signInWithPassword({ email, password });
    return res.status(201).json({ user: publicUser(user), session: signIn.data.session });
  } catch {
    // undo the orphaned auth user so the invite code stays usable
    await supabaseAdmin().auth.admin.deleteUser(created.data.user.id).catch(() => {});
    return res.status(500).json({ error: 'Failed to finish registration' });
  }
});

// POST /auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = await prisma.user.findUnique({ where: { authId: data.user.id } });
  if (!user) return res.status(403).json({ error: 'No app account is linked to this login' });

  return res.json({ user: publicUser(user), session: data.session });
});

// POST /auth/refresh  { refreshToken }
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  const { data, error } = await supabaseAnon().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return res.status(401).json({ error: 'Could not refresh session' });

  return res.json({ session: data.session });
});

// POST /auth/logout
// Access tokens are short-lived and the client discards them on logout; a full
// refresh-token revoke would go through supabaseAdmin().auth.admin here.
router.post('/logout', requireAuth, async (_req, res) => {
  return res.json({ ok: true });
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

// GET /auth/profile — richer: name, store links + tier, weekly caps
router.get('/profile', requireAuth, async (req, res) => {
  const u = req.user!;
  let employee = null;
  if (u.employeeId) {
    const e = await prisma.employee.findUnique({
      where: { id: u.employeeId },
      include: { employeeStores: { include: { store: true } } },
    });
    if (e) {
      employee = {
        id: e.id,
        name: e.name,
        hourLimit: e.hourLimit,
        maxShifts: e.maxShifts,
        standby: e.standby,
        stores: e.employeeStores.map((s) => ({
          storeId: s.storeId,
          storeName: s.store.name,
          proficiency: s.proficiency,
          canOpen: s.canOpen,
        })),
      };
    }
  }
  return res.json({ id: u.id, email: u.email, role: u.role, employee });
});

// POST /auth/change-password  { currentPassword, newPassword }
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
  }

  const check = await supabaseAnon().auth.signInWithPassword({
    email: req.user!.email,
    password: currentPassword,
  });
  if (check.error) return res.status(403).json({ error: 'Current password is incorrect' });

  const updated = await supabaseAdmin().auth.admin.updateUserById(req.user!.authId, {
    password: newPassword,
  });
  if (updated.error) return res.status(400).json({ error: updated.error.message });
  return res.json({ ok: true });
});

export default router;
