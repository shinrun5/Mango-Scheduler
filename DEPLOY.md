# Deploying Fruit Crew

Three moving parts:

| Part | What runs it | Notes |
|------|--------------|-------|
| **Postgres + Auth** | Supabase | already hosted — nothing to deploy |
| **API + frontend** | one Node service | Express serves `/api/*` **and** the built React app from the same origin, so there's no CORS to configure |
| **Solver** | one Python service | FastAPI + OR-Tools, called only by the API (`SOLVER_URL`) |

The frontend calls the API at `/api` with no host (`Frontend/src/lib/api.ts`), so it
must be served from the same origin as the API. The Node service does that in
production; `npm run dev` uses the Vite proxy instead.

**Use Option B (Railway).** For a site employees open weekly, cold starts read as
"it's broken" — Railway keeps the API warm for ~$5/mo. Render's free tier sleeps;
its always-on tier is $7/service ($14 total).

---

## Option A — Render (blueprint, one file)

`render.yaml` in the repo root defines both services.

1. Push a branch with `render.yaml` on it.
2. Render dashboard → **New → Blueprint** → pick this repo → **Apply**.
3. When prompted, paste the five secrets from `Backend/.env`:
   `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Do the [Supabase step](#supabase-auth-allow-list) below with the API's
   `https://fruitcrew-api.onrender.com` URL.

The build runs, in order: frontend `npm ci` + `vite build` → backend `npm ci`
(which runs `prisma generate`) → `prisma migrate deploy`.

**Free tier** works but the service sleeps after 15 min idle (~50 s cold start).
`plan: starter` ($7/mo/service) keeps both warm.

---

## Option B — Railway (recommended: no sleep, ~$5/mo)

Both services deploy from this repo and read their `railway.json`, so the
build/start commands are already set. Hobby plan ($5/mo, usage included) is
enough for this load.

One project, two services:

### 1. API service (also serves the frontend)
- **Add service → GitHub repo → this repo**
- **Settings → Root Directory**: `/` (default — picks up `/railway.json`)
- **Variables**: the five secrets from `Backend/.env`
  (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`), plus
  `SOLVER_URL=http://${{solver.RAILWAY_PRIVATE_DOMAIN}}:${{solver.PORT}}`
  (replace `solver` with whatever you name the service in step 2)
- **Settings → Networking → Generate Domain** — this is the URL you hand out
- Build runs: frontend `npm ci` + `vite build` → backend `npm ci`
  (`prisma generate` via postinstall) → `prisma migrate deploy`, then `npm start`

### 2. Solver service
- **Add service → GitHub repo → this repo** (same repo again)
- **Settings → Root Directory**: `/Solver` (picks up its own `railway.json`)
- No variables needed
- **Do not** generate a public domain — the API reaches it on the private network
- `railway.json` sets `sleepApplication: true`, so it scales to zero and wakes
  when the owner generates a schedule (~once a week). First request after a
  sleep takes ~20–40 s while OR-Tools boots; that's fine for a weekly action.
  Flip it to `false` if you want it always warm.

---

## Supabase Auth allow-list

Supabase → **Authentication → URL Configuration**:
- **Site URL**: the API/frontend URL (e.g. `https://fruitcrew-api.onrender.com`)
- **Redirect URLs**: add the same URL

Without this, login redirects are rejected in production.

---

## Test the production build locally

```bash
# build the frontend so the API can serve it
npm --prefix Frontend run build

# run the API exactly as prod does (needs Backend/.env + the solver running)
npm --prefix Backend start
```

Then open <http://localhost:3000> — the API is now serving the SPA. `/api/health`
should return `{"status":"ok"}`.

## First accounts on a fresh deploy

The owner account is promoted from an existing user (see `Backend/prisma/createOwner.ts`).
Run it against the deployed database, e.g. from Render's shell or locally with the
prod `DATABASE_URL`:

```bash
npm --prefix Backend run create-owner -- <email> "Company name"
```

Managers and employees are then created from inside the app (Stores → Managers,
Workers → invite).
