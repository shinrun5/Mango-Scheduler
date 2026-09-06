import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';
import prisma from './prisma.js';

// Supabase signs access tokens with per-project asymmetric keys (ES256). We verify
// against the project's published JWKS, then look up OUR user row by the token's
// `sub` (the Supabase user UUID) and hang everything downstream off `req.user`.
//
// createRemoteJWKSet caches the key set and only refetches when it sees an unknown
// `kid` (with a cooldown), so this is one network call on the first request.

export interface AuthUser {
  id: number;
  authId: string;
  email: string;
  role: Role;
  employeeId: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error('Missing SUPABASE_URL — set it in Backend/.env');
    jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  let authId: string;
  try {
    const { payload } = await jwtVerify(token, getJwks());
    if (!payload.sub) throw new Error('no sub claim');
    authId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await prisma.user.findUnique({ where: { authId } });
  if (!user) return res.status(401).json({ error: 'No account is linked to this token' });

  req.user = {
    id: user.id,
    authId: user.authId,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
  };
  next();
}

/** Gate a route to one or more roles. Use after `requireAuth`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
