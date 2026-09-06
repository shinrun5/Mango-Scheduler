import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase is used for identity only. Everything the app cares about lives in our
// own `User` table (see prisma/schema.prisma) keyed by an integer id; `authId`
// is the sole reference back to Supabase. Swapping the auth provider later means
// re-pointing these two clients, nothing else.

let admin: SupabaseClient | null = null;
let anon: SupabaseClient | null = null;

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — set it in Backend/.env (Supabase dashboard → Project Settings → API)`);
  }
  return value;
}

const options = { auth: { autoRefreshToken: false, persistSession: false } };

/** service_role key — admin operations (create/delete auth users). Server only. */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) admin = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), options);
  return admin;
}

/** anon key — user-context calls (sign in with password, token refresh). */
export function supabaseAnon(): SupabaseClient {
  if (!anon) anon = createClient(need('SUPABASE_URL'), need('SUPABASE_ANON_KEY'), options);
  return anon;
}
