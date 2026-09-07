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

## Option B — Railway (no sleep, ~$5/mo)

No config file needed — two services in one project.

**API service**
- **Root directory**: `/` (repo root)
- **Build**: `npm --prefix Frontend ci && npm --prefix Frontend run build && npm --prefix Backend ci && npm --prefix Backend run migrate:deploy`
- **Start**: `npm --prefix Backend start`
- **Variables**: the five secrets above, plus
  `SOLVER_URL=http://${{fruitcrew-solver.RAILWAY_PRIVATE_DOMAIN}}:8080`
  (use the solver service's private domain; set its port to 8080 or read `$PORT`)
- **Health check path**: `/api/health`

**Solver service** (same repo, "Add service → GitHub repo" again)
- **Root directory**: `/scheduling-prototype`
- **Build**: `pip install -r solver/requirements.txt`
- **Start**: `uvicorn solver.service:app --host 0.0.0.0 --port $PORT`
- Leave it on the private network only (don't generate a public domain).

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
