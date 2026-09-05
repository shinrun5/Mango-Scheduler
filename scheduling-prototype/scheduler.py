"""
Scheduler prototype -- Phase 2 (feasibility) + basic soft objectives.

Hardcoded data, no database yet. Run:  python scheduler.py
    (needs: pip install ortools)

Purpose: see a valid weekly schedule print, and understand how each business
rule becomes a CP-SAT variable or constraint before wiring in Postgres.

MODEL IN ONE PARAGRAPH
Every (store, day) has two atomic slots: MORNING (11:30-17:00) and
NIGHT (17:00-closing). A "whole day" shift = the same person on BOTH slots
of that store/day; a "split" = two different people. We create one boolean
per allowed (employee, slot), then constrain coverage, availability, hours,
shift counts and double-booking, and finally optimise:
    fill every seat  >  fair hours / everyone >=2  >  fewer splits  >  honour "no back-to-back"
"""

from ortools.sat.python import cp_model

# ==========================================================================
# 1. HARDCODED INPUT  (this is exactly what will later come from the DB)
# ==========================================================================

DAYS = ["MON", "FRI", "SAT"]          # a subset of the week for the demo
LATE_DAYS = {"FRI", "SAT"}            # close 23:00 instead of 22:30

TIER = {"NEW": 0, "REGULAR": 1, "SENIOR": 2, "MANAGER": 3}
TIERS_DESC = ["MANAGER", "SENIOR", "REGULAR", "NEW"]
STORES = ["Downtown", "Airport"]

# tier is per-store (mirrors your EmployeeStore model)
EMPLOYEES = {
    "Alice": dict(tier={"Downtown": "SENIOR",  "Airport": "SENIOR"},  hour_limit=40, max_shifts=6, no_b2b=False),
    "Bob":   dict(tier={"Downtown": "MANAGER"},                       hour_limit=45, max_shifts=6, no_b2b=False),
    "Cara":  dict(tier={"Downtown": "REGULAR", "Airport": "REGULAR"}, hour_limit=20, max_shifts=3, no_b2b=True),
    "Drew":  dict(tier={"Downtown": "NEW"},                           hour_limit=15, max_shifts=3, no_b2b=True),
    "Erin":  dict(tier={"Airport": "SENIOR"},                         hour_limit=30, max_shifts=4, no_b2b=False),
    "Finn":  dict(tier={"Downtown": "NEW",     "Airport": "NEW"},     hour_limit=18, max_shifts=3, no_b2b=False),
}

# EFFECTIVE availability for the target week = the permanent recurring schedule
# with any temporary one-week overrides already merged in.
# day -> list of (start, end) as decimal hours, e.g. 11.5 == 11:30
AVAILABILITY = {
    "Alice": {"MON": [(11.5, 23.5)], "FRI": [(11.5, 23.5)], "SAT": [(11.5, 23.5)]},
    "Bob":   {"MON": [(11.5, 23.5)], "FRI": [(11.5, 23.5)]},
    "Cara":  {"MON": [(11.5, 17.0)], "FRI": [(16.0, 23.5)], "SAT": [(11.5, 23.5)]},
    "Drew":  {"MON": [(16.0, 23.5)], "SAT": [(16.0, 23.5)]},
    "Erin":  {"MON": [(11.5, 23.5)], "FRI": [(11.5, 23.5)], "SAT": [(11.5, 23.5)]},
    "Finn":  {"MON": [(11.5, 23.5)], "FRI": [(11.5, 23.5)], "SAT": [(11.5, 23.5)]},
}

# Demand per (store, day, slot): minimum bodies needed AT EACH TIER-OR-HIGHER.
# {"SENIOR": 1, "NEW": 1} => "at least 1 senior-or-above AND at least 2 people total".
def requirements():
    reqs = []
    for d in DAYS:
        reqs.append(dict(store="Downtown", day=d, slot="MORNING", need={"SENIOR": 1}))
        reqs.append(dict(store="Downtown", day=d, slot="NIGHT",   need={"SENIOR": 1, "NEW": 1}))
        reqs.append(dict(store="Airport",  day=d, slot="MORNING", need={"SENIOR": 1}))
        reqs.append(dict(store="Airport",  day=d, slot="NIGHT",   need={"NEW": 1}))
    return reqs

# Shifts the manager already placed by hand / guaranteed weekly shifts.
# (employee, store, day, slot) -- forced ON, never moved.
LOCKED = [
    ("Bob", "Downtown", "MON", "MORNING"),
    ("Bob", "Downtown", "MON", "NIGHT"),   # Bob = guaranteed whole day, Mon Downtown
]

NUM_SCHEDULES = 3        # produce up to this many distinct options to review


# ==========================================================================
# 2. HELPERS
# ==========================================================================

def closing(day):
    return 23.0 if day in LATE_DAYS else 22.5

def slot_window(day, slot):
    return (11.5, 17.0) if slot == "MORNING" else (17.0, closing(day))

def half_hours(day, slot):
    s, e = slot_window(day, slot)
    return round((e - s) * 2)           # duration in 30-minute blocks (integer)

def works_at(emp, store):
    return store in EMPLOYEES[emp]["tier"]

def eff_tier(emp, store):
    return TIER[EMPLOYEES[emp]["tier"][store]]

def eff_tier_max(emp):
    return max(TIER[v] for v in EMPLOYEES[emp]["tier"].values())

def available(emp, day, slot):
    """Does the slot fit inside one of the employee's windows that day?
    NIGHT slots allow arriving up to 1 hour late."""
    s, e = slot_window(day, slot)
    grace = 1.0 if slot == "NIGHT" else 0.0
    for a, b in AVAILABILITY.get(emp, {}).get(day, []):
        if a <= s + grace and b >= e:
            return True
    return False

def allowed(emp, r):
    return works_at(emp, r["store"]) and available(emp, r["day"], r["slot"])


# ==========================================================================
# 3. BUILD + SOLVE
# ==========================================================================

def build_and_solve(no_good_cuts):
    model = cp_model.CpModel()
    reqs = requirements()
    emps = list(EMPLOYEES)

    # ---- decision variables: x[(emp, store, day, slot)] for allowed combos ----
    x = {}
    for r in reqs:
        for e in emps:
            if allowed(e, r):
                k = (e, r["store"], r["day"], r["slot"])
                x[k] = model.NewBoolVar("x_%s_%s_%s_%s" % k)

    # locked / guaranteed shifts: force ON (create the var if it wasn't allowed)
    for k in LOCKED:
        if k not in x:
            x[k] = model.NewBoolVar("x_%s_%s_%s_%s" % k)
        model.Add(x[k] == 1)

    # ---- coverage, with tier substitution (cumulative from the top tier) ----
    shortfalls = []
    for r in reqs:
        cum = 0
        for t in TIERS_DESC:
            cum += r["need"].get(t, 0)
            if cum == 0:
                continue
            pool = [x[(e, r["store"], r["day"], r["slot"])] for e in emps
                    if (e, r["store"], r["day"], r["slot"]) in x
                    and eff_tier(e, r["store"]) >= TIER[t]]
            short = model.NewIntVar(0, cum, "short_%s_%s_%s_%s" %
                                    (r["store"], r["day"], r["slot"], t))
            model.Add(sum(pool) + short >= cum)
            shortfalls.append(short)

    # ---- one place at a time: same slot, at most one store ----
    for e in emps:
        for d in DAYS:
            for sl in ("MORNING", "NIGHT"):
                vs = [x[(e, s, d, sl)] for s in STORES if (e, s, d, sl) in x]
                if len(vs) > 1:
                    model.Add(sum(vs) <= 1)

    # ---- weekly hour limit + shift-count limit, per employee ----
    shift_count = {}
    for e in emps:
        mine = [(k, v) for k, v in x.items() if k[0] == e]
        model.Add(sum(half_hours(k[2], k[3]) * v for k, v in mine)
                  <= EMPLOYEES[e]["hour_limit"] * 2)
        sc = model.NewIntVar(0, len(mine), "count_%s" % e)
        model.Add(sc == sum(v for _, v in mine))
        model.Add(sc <= EMPLOYEES[e]["max_shifts"])
        shift_count[e] = sc

    # ---- "whole day" (both slots, same store) is SENIOR-and-above only ----
    for e in emps:
        if eff_tier_max(e) < TIER["SENIOR"]:
            for s in STORES:
                for d in DAYS:
                    both = [x[(e, s, d, sl)] for sl in ("MORNING", "NIGHT")
                            if (e, s, d, sl) in x]
                    if len(both) == 2:
                        model.Add(sum(both) <= 1)

    # ---- continuity bonus: reward one person covering a whole store-day ----
    cont = []
    for e in emps:
        for s in STORES:
            for d in DAYS:
                m = x.get((e, s, d, "MORNING"))
                n = x.get((e, s, d, "NIGHT"))
                if m is None or n is None:
                    continue
                w = model.NewBoolVar("cont_%s_%s_%s" % (e, s, d))
                model.Add(w <= m)
                model.Add(w <= n)
                model.Add(w >= m + n - 1)         # w == (m AND n)
                cont.append(w)

    # ---- fairness: minimise the spread between busiest and quietest ----
    counts = list(shift_count.values())
    max_c = model.NewIntVar(0, len(reqs), "max_c")
    min_c = model.NewIntVar(0, len(reqs), "min_c")
    model.AddMaxEquality(max_c, counts)
    model.AddMinEquality(min_c, counts)
    spread = model.NewIntVar(0, len(reqs), "spread")
    model.Add(spread == max_c - min_c)

    # ---- everyone gets at least 2 shifts (soft) ----
    below2 = []
    for e in emps:
        b = model.NewIntVar(0, 2, "below2_%s" % e)
        model.Add(shift_count[e] + b >= 2)
        below2.append(b)

    # ---- "no back-to-back" preference (soft) ----
    # NOTE: demo DAYS are MON/FRI/SAT which aren't truly adjacent; with a real
    # 7-day week you'd compare genuinely consecutive days here.
    b2b = []
    for e in emps:
        if not EMPLOYEES[e]["no_b2b"]:
            continue
        worked = {}
        for d in DAYS:
            vs = [x[(e, s, d, sl)] for s in STORES for sl in ("MORNING", "NIGHT")
                  if (e, s, d, sl) in x]
            wd = model.NewBoolVar("worked_%s_%s" % (e, d))
            if vs:
                model.AddMaxEquality(wd, vs)
            else:
                model.Add(wd == 0)
            worked[d] = wd
        for i in range(len(DAYS) - 1):
            pen = model.NewBoolVar("b2b_%s_%d" % (e, i))
            model.Add(pen >= worked[DAYS[i]] + worked[DAYS[i + 1]] - 1)
            b2b.append(pen)

    # ---- "give me a different schedule" cuts for options 2 and 3 ----
    for chosen in no_good_cuts:
        ones = [x[k] for k in chosen if k in x]
        zeros = [x[k] for k in x if k not in chosen]
        model.Add(sum(ones) - sum(zeros) <= len(ones) - 1)   # force >=1 change

    # ---- objective: weights encode the priority order ----
    W_SHORT, W_BELOW2, W_B2B, W_SPREAD, W_CONT = 1000, 40, 25, 10, 4
    model.Minimize(
        W_SHORT * sum(shortfalls)
        + W_BELOW2 * sum(below2)
        + W_B2B * sum(b2b)
        + W_SPREAD * spread
        - W_CONT * sum(cont)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    chosen = [k for k, v in x.items() if solver.Value(v) == 1]
    info = dict(
        objective=solver.ObjectiveValue(),
        unfilled=sum(solver.Value(s) for s in shortfalls),
        spread=solver.Value(spread),
        counts={e: solver.Value(c) for e, c in shift_count.items()},
    )
    return chosen, info


# ==========================================================================
# 4. OUTPUT
# ==========================================================================

def fmt(chosen):
    grid = {}
    for (e, s, d, sl) in chosen:
        grid.setdefault((d, s), {"MORNING": [], "NIGHT": []})[sl].append(e)
    lines = []
    for d in DAYS:
        for s in STORES:
            cell = grid.get((d, s), {"MORNING": [], "NIGHT": []})
            lines.append("  %-4s %-9s  day: %-20s night: %s" % (
                d, s,
                ", ".join(sorted(cell["MORNING"])) or "-",
                ", ".join(sorted(cell["NIGHT"])) or "-"))
    return "\n".join(lines)


if __name__ == "__main__":
    cuts = []
    for i in range(NUM_SCHEDULES):
        res = build_and_solve(cuts)
        if res is None:
            print("No feasible schedule found." if i == 0 else "No more distinct schedules.")
            break
        chosen, info = res
        print("=" * 64)
        print("OPTION %d   score=%.0f   unfilled seats=%d   hour-spread=%d"
              % (i + 1, info["objective"], info["unfilled"], info["spread"]))
        print(fmt(chosen))
        print("  shifts/person:", info["counts"])
        cuts.append(chosen)
