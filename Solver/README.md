# Solver service

FastAPI wrapper around a general CP-SAT scheduling engine. The Express backend
(`Backend/`) calls this over HTTP to turn DB data into a weekly schedule.

## Run

```bash
cd Solver
uvicorn service:app --reload --port 8000
```

First time / fresh venv:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn service:app --reload --port 8000
```

## Endpoints

- `GET /health` -> `{"status": "ok"}`
- `POST /solve` -> takes a `SolveRequest` (see `service.py`), returns assignments + gaps.

Quick check:

```bash
curl -s -X POST http://localhost:8000/solve \
  -H 'Content-Type: application/json' \
  --data-binary @sample_payload.json | python3 -m json.tool
```

## Contract

Times are `"HH:MM"` 24h strings. Days are `MONDAY`..`SUNDAY`. Tiers are
`NEW < REGULAR < SENIOR < MANAGER`.

**Request**

| field | meaning |
|---|---|
| `employees[].stores[]` | which stores an employee can work, their `tier` and `canOpen` flag there |
| `availability[]` | recurring weekly windows, per employee per day |
| `requirements[]` | one demand block: a store/day/window with `head` (people needed), `seniorMin`, `needOpen`, `allowNew` |
| `solveSeconds` | solver time budget (default 5) |

**Response**: `feasible`, `optimal`, `objective`, `assignments[] {requirementId, employeeId}`,
`gaps[] {requirementId, kind, shortBy}`, `stats {shiftsPerEmployee, spread, unfilled}`.

## Not modelled yet (dropped from `scheduler_real.py`)

Per-employee `maxShifts` / full-vs-half-day caps / no-back-to-back, manager-locked
shifts, and one-off personal rules. The DB has no columns for these; add them to
the Prisma schema and the `/schedule/generate` payload builder when needed.
`canOpen` is currently derived as `tier >= SENIOR` in the backend, not stored.
