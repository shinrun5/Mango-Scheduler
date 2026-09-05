"""
Scheduler -- REAL roster from the Mango Mango / Ciao Poke availability sheet.

Run:  .venv/bin/python scheduler_real.py     (needs ortools in the venv)

Same engine ideas as scheduler.py (read that file's comments first). Differences:
  - two stores with different open / close / night-start times
  - day-specific demand
  - NEW workers get NIGHT slots only (can't open)
  - at Mango the opener works the full day  =>  MORNING assignment implies NIGHT
  - Thursday: a NEW at night means you still need 3 non-new at night
  - a few personal rules: Rey Sat-xor-Sun + no back-to-back, Kai max 1 shift,
    Mysha capped (prefers not to work)
  - can_open is a per-employee flag, NOT derived from tier: some Regulars can
    open (Cindy). Opener slots just need >=1 can_open person present.
  - NEW workers: soft-capped at <=3 days/week and kept off Fri/weekends unless
    coverage would otherwise fail
"""

import os
from ortools.sat.python import cp_model

DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
TIER = {"NEW": 0, "REGULAR": 1, "SENIOR": 2, "MANAGER": 3}

# demo helper: SCHED_DROP="Owen,Rey" removes people so a slot goes unfilled and
# the manager escalation report fires. Empty in normal use.
DROP = {s.strip() for s in os.environ.get("SCHED_DROP", "").split(",") if s.strip()}

STORES = {
    "Mango": dict(open=11.5,  night=17.0, close={"FRI": 23.0, "SAT": 23.0}, close_def=22.5),
    "Ciao":  dict(open=10.75, night=16.0, close={"FRI": 22.0, "SAT": 22.0}, close_def=21.5),
}

def close_of(store, day):
    s = STORES[store]
    return s["close"].get(day, s["close_def"])

# --------------------------------------------------------------------------
# ROSTER  -- availability is a dict day -> list of (start, end) decimal hours
# --------------------------------------------------------------------------
FULL_M = (11.5, 23.5)     # "full day" marker at Mango
FULL_C = (10.75, 22.5)    # "full day" marker at Ciao
FULL_B = (10.0, 23.5)     # full day, either store
NIGHT_M = (16.5, 23.5)    # "night" marker at Mango (grace handles the 17:00 start)

def E(tier, stores, avail, **flags):
    return dict(tier=tier, stores=stores, avail=avail,
                hour_limit=flags.get("hour_limit", 60),
                max_shifts=flags.get("max_shifts", 6),
                max_full=flags.get("max_full", 7),       # full-day shifts / week
                max_half=flags.get("max_half", 7),       # half-day (partial) shifts / week
                min_shifts=flags.get("min_shifts", 0),   # thin-availability people
                no_b2b=flags.get("no_b2b", False),
                can_open=flags.get("can_open", False))

EMPLOYEES = {
    # Mango Mango
    "Jasmine": E("REGULAR", ["Mango"], {"MON": [NIGHT_M], "TUE": [NIGHT_M], "WED": [NIGHT_M],
                                        "FRI": [NIGHT_M], "SAT": [FULL_M], "SUN": [FULL_M]},
                can_open=False),
    "Julia":   E("SENIOR",  ["Mango"], {"TUE": [NIGHT_M]},
                can_open=True),
    "Mysha":   E("REGULAR", ["Mango"], {"MON": [FULL_M]},
                max_shifts=1, can_open=False),          # next week: prefers not to work; Mon only
    "Owen":    E("SENIOR",  ["Mango"], {"WED": [FULL_M], "THU": [FULL_M], "FRI": [FULL_M],
                                        "SAT": [FULL_M], "SUN": [FULL_M]},
                can_open=True),
    "Rachel L.": E("NEW",   ["Mango"], {"MON": [(14.5, 23.5)], "TUE": [(14.5, 23.5)],
                                        "WED": [(17.5, 23.5)], "THU": [(17.5, 23.5)],
                                        "FRI": [FULL_M], "SAT": [FULL_M], "SUN": [FULL_M]},
                can_open=False),
    "Rachel X.": E("SENIOR", ["Mango"], {"MON": [FULL_M]},
                can_open=True),
    "Rey":     E("SENIOR",  ["Mango"], {"TUE": [FULL_M], "THU": [NIGHT_M], "FRI": [NIGHT_M],
                                        "SAT": [FULL_M], "SUN": [FULL_M]},
                no_b2b=True, can_open=True),
    # Ciao Poke
    "Abby":    E("REGULAR", ["Ciao"], {"THU": [(10.0, 16.5)], "SAT": [(10.0, 16.5)]},
                min_shifts=1, can_open=True),                   # thin availability -> guarantee one
    "Kai":     E("REGULAR", ["Ciao"], {"FRI": [FULL_C], "SAT": [FULL_C]},
                max_full=1, max_half=2, can_open=True),         # 1 full day + up to 2 half days/wk
    "Michael": E("REGULAR", ["Ciao"], {"WED": [(10.0, 13.0)], "THU": [(10.0, 16.5)], "FRI": [FULL_C]},
                can_open=True),
    "Leo":     E("REGULAR", ["Ciao"], {"MON": [FULL_C], "WED": [(13.0, 22.5)],
                                       "FRI": [(14.0, 22.5)], "SUN": [FULL_C]},
                can_open=True),
    # both stores
    "Cindy":   E("REGULAR", ["Mango", "Ciao"],
                 {"MON": [FULL_B], "TUE": [FULL_B], "WED": [FULL_B],
                  "FRI": [FULL_B], "SUN": [FULL_B]},
                 can_open=True),                                # Regular, but a trusted opener
    "Daniel":  E("MANAGER", ["Mango", "Ciao"],
                 {"WED": [(19.0, 23.5)], "THU": [FULL_B], "FRI": [(18.0, 23.5)],
                  "SAT": [FULL_B], "SUN": [FULL_B]},
                 can_open=True),
}

RESTRICTIONS = [("Rey_sat_xor_sun",)]     # handled explicitly below

# Hand-placed / manager-forced assignments -- (emp, store, day, slot), forced ON.
# Cindy: Poke Friday until ~2, then Mango Friday for the rest of the day / night.
LOCKED = [
    ("Cindy", "Ciao",  "FRI", "MORNING"),
    ("Cindy", "Mango", "FRI", "NIGHT"),
]

# --------------------------------------------------------------------------
# SLOTS + DEMAND per (store, day)
#   each slot: name, (start, end), need = {tier: min_count}, allow_new
# --------------------------------------------------------------------------
def slots_for(store, day):
    S = STORES[store]
    c = close_of(store, day)
    if store == "Mango":
        if day in ("MON", "TUE", "WED", "THU", "FRI"):
            # Friday wants 2 opening but the 2nd may arrive late -> big grace;
            # here Cindy is that 2nd person (locked to Mango Fri night), so head=1.
            m_head, m_grace = (1, 3.0) if day == "FRI" else (1, 0.0)
            n_head = 4 if day == "FRI" else 3
            return [
                # opener slot: just needs >=1 person with can_open (tier is not
                # the gate -- Cindy the Regular can solo-open, some Seniors can't).
                dict(name="MORNING", win=(S["open"], S["night"]),
                     head=m_head, senior_min=0, need_open=True,
                     allow_new=False, grace=m_grace),
                # Thursday night: "two seniors + a new" is acceptable.
                dict(name="NIGHT", win=(S["night"], c),
                     head=n_head, senior_min=(2 if day == "THU" else 0), allow_new=True),
            ]
        return [dict(name="DAY", win=(S["open"], c),
                     head=4, senior_min=1, need_open=True, allow_new=False)]
    else:  # Ciao -- "one person the whole day", two on Friday
        head = 2 if day == "FRI" else 1
        return [
            dict(name="MORNING", win=(S["open"], S["night"]),
                 head=head, senior_min=0, need_open=True, allow_new=False),
            dict(name="NIGHT", win=(S["night"], c),
                 head=head, senior_min=0, allow_new=False),
        ]

# --------------------------------------------------------------------------
def available(emp, day, win, grace):
    for a, b in EMPLOYEES[emp]["avail"].get(day, []):
        if a <= win[0] + grace and b >= win[1]:
            return True
    return False

def hhmm(x):
    h = int(x); mm = int(round((x - h) * 60))
    return "%d:%02d" % (h, mm)

def overlap_windows(win, day, emp):
    """Availability windows for emp on day that overlap slot win AT ALL (even partly)."""
    lo, hi = win
    return [(a, b) for a, b in EMPLOYEES[emp]["avail"].get(day, [])
            if max(lo, a) < min(hi, b)]

def escalation_candidates(store, day, slot, working_set):
    """Who the manager could pull for an unfilled slot -- anyone at this store with
    ANY availability overlapping the window, not already on the slot. Each entry
    flags whether they cover the whole window (drop-in) or only part (=> the
    manager builds a custom / split shift)."""
    grace = slot.get("grace", 1.0 if slot["name"] == "NIGHT" else 0.0)
    out = []
    for e in EMPLOYEES:
        if e in DROP:
            continue
        ee = EMPLOYEES[e]
        if store not in ee["stores"] or (e, store, day, slot["name"]) in working_set:
            continue
        if ee["tier"] == "NEW" and not slot["allow_new"]:
            continue
        wins = overlap_windows(slot["win"], day, e)
        if not wins:
            continue
        covers_full = any(a <= slot["win"][0] + grace and b >= slot["win"][1]
                          for a, b in wins)
        out.append(dict(emp=e, tier=ee["tier"], can_open=ee["can_open"],
                        windows=wins, full=covers_full))
    # drop-ins first, then by tier desc
    out.sort(key=lambda c: (not c["full"], -TIER[c["tier"]]))
    return out

def can_fill(emp, store, day, slot):
    e = EMPLOYEES[emp]
    if store not in e["stores"]:
        return False
    if e["tier"] == "NEW" and not slot["allow_new"]:
        return False
    grace = slot.get("grace", 1.0 if slot["name"] == "NIGHT" else 0.0)
    return available(emp, day, slot["win"], grace)

def tier_ok_for(emp, need_tier):
    return TIER[EMPLOYEES[emp]["tier"]] >= TIER[need_tier]

def hours(win):
    return round((win[1] - win[0]) * 2)      # 30-min blocks


def build_and_solve(cuts):
    m = cp_model.CpModel()
    emps = [e for e in EMPLOYEES if e not in DROP]
    x = {}                                    # (emp, store, day, slotname) -> BoolVar
    slotmap = {}                              # (store, day, slotname) -> slot dict
    for store in STORES:
        for day in DAYS:
            for slot in slots_for(store, day):
                slotmap[(store, day, slot["name"])] = slot
                for e in emps:
                    if can_fill(e, store, day, slot):
                        x[(e, store, day, slot["name"])] = m.NewBoolVar(
                            "x_%s_%s_%s_%s" % (e, store, day, slot["name"]))

    # hand-placed shifts: force ON (create the var even if availability wouldn't allow)
    for k in LOCKED:
        if k not in x:
            x[k] = m.NewBoolVar("x_%s_%s_%s_%s" % k)
        m.Add(x[k] == 1)

    short, over = [], []
    gapvars = {}                    # (store, day, sname) -> {"head"/"senior"/"open": IntVar}
    for (store, day, sname), slot in slotmap.items():
        g = gapvars.setdefault((store, day, sname), {})
        present = [x[(e, store, day, sname)] for e in emps if (e, store, day, sname) in x]
        # total head count (+ don't over-staff a slot)
        s = m.NewIntVar(0, slot["head"], "short_%s_%s_%s_head" % (store, day, sname))
        m.Add(sum(present) + s >= slot["head"])
        short.append(s); g["head"] = s
        if present:
            ov = m.NewIntVar(0, len(present), "over_%s_%s_%s" % (store, day, sname))
            m.Add(sum(present) - ov <= slot["head"])
            over.append(ov)
        # senior minimum (pure tier: SENIOR+ only)
        if slot["senior_min"]:
            srp = [x[(e, store, day, sname)] for e in emps
                   if (e, store, day, sname) in x and tier_ok_for(e, "SENIOR")]
            s = m.NewIntVar(0, slot["senior_min"], "short_%s_%s_%s_sr" % (store, day, sname))
            m.Add(sum(srp) + s >= slot["senior_min"])
            short.append(s); g["senior"] = s
        # opener minimum: slot needs >=1 person flagged can_open
        if slot.get("need_open"):
            opp = [x[(e, store, day, sname)] for e in emps
                   if (e, store, day, sname) in x and EMPLOYEES[e]["can_open"]]
            s = m.NewIntVar(0, 1, "short_%s_%s_%s_open" % (store, day, sname))
            m.Add(sum(opp) + s >= 1)
            short.append(s); g["open"] = s
        # at most one NEW per store-day
        news = [x[(e, store, day, sname)] for e in emps
                if (e, store, day, sname) in x and EMPLOYEES[e]["tier"] == "NEW"]
        if news:
            m.Add(sum(news) <= 1)

    # "opener works the full day" is a strong PREFERENCE (continuity bonus below),
    # not a hard rule -- splitting is allowed when nobody else can cover.

    # one place at a time: same slot-window, at most one store
    for e in emps:
        for day in DAYS:
            for sname in ("MORNING", "NIGHT", "DAY"):
                vs = [x[(e, s, day, sname)] for s in STORES if (e, s, day, sname) in x]
                if len(vs) > 1:
                    m.Add(sum(vs) <= 1)
            # a DAY slot overlaps both MORNING and NIGHT
            day_vs = [x[(e, s, day, "DAY")] for s in STORES if (e, s, day, "DAY") in x]
            mn_vs = [x[(e, s, day, sn)] for s in STORES for sn in ("MORNING", "NIGHT")
                     if (e, s, day, sn) in x]
            if day_vs and mn_vs:
                m.Add(sum(day_vs) + sum(mn_vs) <= 1)

    # hour limit (real hours) + shift-count limit (distinct DAYS worked)
    worked, shift_count = {}, {}
    for e in emps:
        mine = [(k, v) for k, v in x.items() if k[0] == e]
        m.Add(sum(hours(slotmap[(k[1], k[2], k[3])]["win"]) * v for k, v in mine)
              <= EMPLOYEES[e]["hour_limit"] * 2)
        for day in DAYS:
            dv = [v for k, v in mine if k[2] == day]
            w = m.NewBoolVar("worked_%s_%s" % (e, day))
            if dv:
                m.AddMaxEquality(w, dv)
            else:
                m.Add(w == 0)
            worked[(e, day)] = w
        sc = m.NewIntVar(0, len(DAYS), "count_%s" % e)
        m.Add(sc == sum(worked[(e, d)] for d in DAYS))
        m.Add(sc <= EMPLOYEES[e]["max_shifts"])
        shift_count[e] = sc

    # full-day vs half-day shifts, and per-employee caps on each (e.g. Kai:
    # 1 full + 2 half). A "full day" = a DAY slot, or MORNING+NIGHT at one store.
    full_day, half_day = {}, {}
    for e in emps:
        fulls, halves = [], []
        for day in DAYS:
            parts = []
            for s in STORES:
                if (e, s, day, "DAY") in x:
                    parts.append(x[(e, s, day, "DAY")])
                if (e, s, day, "MORNING") in x and (e, s, day, "NIGHT") in x:
                    both = m.NewBoolVar("full_%s_%s_%s" % (e, s, day))
                    m.AddMinEquality(both, [x[(e, s, day, "MORNING")],
                                            x[(e, s, day, "NIGHT")]])
                    parts.append(both)
            fd = m.NewBoolVar("fullday_%s_%s" % (e, day))
            m.AddMaxEquality(fd, parts) if parts else m.Add(fd == 0)
            hd = m.NewBoolVar("halfday_%s_%s" % (e, day))
            m.Add(hd >= worked[(e, day)] - fd)
            m.Add(hd <= worked[(e, day)])
            m.Add(hd <= 1 - fd)
            full_day[(e, day)], half_day[(e, day)] = fd, hd
            fulls.append(fd); halves.append(hd)
        m.Add(sum(fulls) <= EMPLOYEES[e]["max_full"])
        m.Add(sum(halves) <= EMPLOYEES[e]["max_half"])

    # no back-to-back for flagged employees
    b2b = []
    for e in emps:
        if not EMPLOYEES[e]["no_b2b"]:
            continue
        for i in range(len(DAYS) - 1):
            p = m.NewBoolVar("b2b_%s_%d" % (e, i))
            m.Add(p >= worked[(e, DAYS[i])] + worked[(e, DAYS[i + 1])] - 1)
            b2b.append(p)

    # Rey: Saturday XOR Sunday
    m.Add(worked[("Rey", "SAT")] + worked[("Rey", "SUN")] <= 1)

    # continuity bonus: reward one person covering a whole day at MANGO only.
    # Ciao is fine with morning-only / split shifts, so no bonus there.
    cont = []
    for e in emps:
        for day in DAYS:
            mk = (e, "Mango", day, "MORNING")
            if mk in x and (e, "Mango", day, "NIGHT") in x:
                cont.append(x[mk])

    # Owen's half-day request: night-only on Thursday (but if he CAN do a full
    # day -- e.g. Friday -- a senior working the full day is preferred, so Fri
    # is not penalised here).
    owen_night_pref = [x[k] for k in (("Owen", "Mango", "THU", "MORNING"),) if k in x]

    # NEW workers: keep them to <=3 distinct days/week, and off Fri/Sat/Sun,
    # unless coverage (weight 1000) forces it. Both are soft.
    new_pen = []                                   # list of (weight, BoolVar/IntVar)
    for e in emps:
        if EMPLOYEES[e]["tier"] != "NEW":
            continue
        extra = m.NewIntVar(0, len(DAYS), "new_extra_%s" % e)
        m.Add(extra >= shift_count[e] - 3)         # penalise the 4th day onward
        new_pen.append((60, extra))
        for day in ("FRI", "SAT", "SUN"):
            new_pen.append((20, worked[(e, day)]))

    # soft "give thin-availability people at least min_shifts"
    softmin = []
    for e in emps:
        if EMPLOYEES[e]["min_shifts"]:
            d = m.NewIntVar(0, EMPLOYEES[e]["min_shifts"], "under_%s" % e)
            m.Add(shift_count[e] + d >= EMPLOYEES[e]["min_shifts"])
            softmin.append(d)

    # fairness: minimise spread of shift counts
    counts = list(shift_count.values())
    mx = m.NewIntVar(0, 20, "mx"); mn = m.NewIntVar(0, 20, "mn")
    m.AddMaxEquality(mx, counts); m.AddMinEquality(mn, counts)
    spread = m.NewIntVar(0, 20, "spread"); m.Add(spread == mx - mn)

    # "give me a different option" cuts
    for chosen in cuts:
        ones = [x[k] for k in chosen if k in x]
        zeros = [x[k] for k in x if k not in chosen]
        m.Add(sum(ones) - sum(zeros) <= len(ones) - 1)

    obj = (1000 * sum(short) + 200 * sum(softmin) + 30 * sum(over)
           + 25 * sum(b2b) + 40 * sum(owen_night_pref)
           + 8 * spread - 15 * sum(cont)
           + sum(w * v for w, v in new_pen))
    if os.environ.get("SCHED_WORST") == "1":
        # worst schedule that STILL fully covers every slot: pin all shortages to
        # 0, then maximise everything else (overstaffing, unfairness, b2b, ...).
        for s in short:
            m.Add(s == 0)
        m.Maximize(obj)
    else:
        m.Minimize(obj)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 20
    st = solver.Solve(m)
    if st not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None
    chosen = [k for k, v in x.items() if solver.Value(v) == 1]
    working_set = set(chosen)

    # unfilled slots -> what the manager gets notified about, with a candidate list
    gaps = []
    for (store, day, sname), gv in gapvars.items():
        need = {kind: solver.Value(var) for kind, var in gv.items() if solver.Value(var)}
        if not need:
            continue
        slot = slotmap[(store, day, sname)]
        gaps.append(dict(
            store=store, day=day, slot=sname, win=slot["win"], need=need,
            assigned=sorted(e for (e, s, d, sn) in chosen
                            if (s, d, sn) == (store, day, sname)),
            candidates=escalation_candidates(store, day, slot, working_set)))

    val = lambda vs: sum(solver.Value(v) for v in vs)
    info = dict(objective=solver.ObjectiveValue(),
                optimal=(st == cp_model.OPTIMAL),
                unfilled=val(short),
                spread=solver.Value(spread),
                counts={e: solver.Value(c) for e, c in shift_count.items()},
                breakdown=dict(
                    short=1000 * val(short), softmin=200 * val(softmin),
                    over=30 * val(over), b2b=25 * val(b2b),
                    owen=40 * val(owen_night_pref), spread=8 * solver.Value(spread),
                    continuity=-15 * val(cont),
                    new_pen=sum(w * solver.Value(v) for w, v in new_pen)),
                gaps=gaps)
    return chosen, info


def show_gaps(gaps):
    if not gaps:
        return "  (all slots filled -- no manager action needed)"
    kind_txt = {"head": "short-staffed", "senior": "needs a senior",
                "open": "needs an opener"}
    out = ["  !! %d slot(s) need manager review:" % len(gaps)]
    for g in gaps:
        reasons = ", ".join("%s x%d" % (kind_txt[k], n) for k, n in g["need"].items())
        out.append("  * %s %s %s  (%s-%s)  -- %s"
                   % (g["store"], g["day"], g["slot"].lower(),
                      hhmm(g["win"][0]), hhmm(g["win"][1]), reasons))
        if g["assigned"]:
            out.append("      on it: %s" % ", ".join(g["assigned"]))
        if not g["candidates"]:
            out.append("      no one with any availability -- widen the search or move a shift")
        for c in g["candidates"]:
            wins = ", ".join("%s-%s" % (hhmm(a), hhmm(b)) for a, b in c["windows"])
            tag = "covers full slot" if c["full"] else "PARTIAL -> custom/split shift"
            flags = c["tier"].lower() + (", can open" if c["can_open"] else "")
            out.append("      - %-10s %s  [%s]  avail %s" % (c["emp"], tag, flags, wins))
    return "\n".join(out)


def show(chosen):
    grid = {}
    for (e, store, day, sname) in chosen:
        grid.setdefault((store, day), {}).setdefault(sname, []).append(e)
    out = []
    for store in STORES:
        out.append("  --- %s ---" % store)
        for day in DAYS:
            cell = grid.get((store, day), {})
            parts = []
            for sn in ("MORNING", "NIGHT", "DAY"):
                if sn in cell:
                    parts.append("%s: %s" % (sn.lower(), ", ".join(sorted(cell[sn]))))
            out.append("  %-4s %s" % (day, "   ".join(parts) if parts else "(empty)"))
    return "\n".join(out)


def show_diff(options):
    """Manager-facing summary of what actually changes between the option(s)."""
    if len(options) < 2:
        return ""
    n = len(options)
    per_slot = {}                         # (store, day, sname) -> list of sets, one per option
    for i, (chosen, _) in enumerate(options):
        for (e, store, day, sname) in chosen:
            per_slot.setdefault((store, day, sname), [set() for _ in range(n)])[i].add(e)

    changed = {k: v for k, v in per_slot.items() if any(s != v[0] for s in v[1:])}
    out = ["", "=" * 66, "WHAT'S DIFFERENT BETWEEN THE %d OPTIONS" % n]
    if not changed:
        out.append("  Staffing is identical -- options differ only in solver internals.")
    else:
        out.append("  %d slot(s) staffed differently:" % len(changed))
        for (store, day, sname) in sorted(changed):
            v = changed[(store, day, sname)]
            common = set.intersection(*v)
            out.append("  * %s %s %s   (same in all: %s)"
                       % (store, day, sname.lower(),
                          ", ".join(sorted(common)) or "nobody"))
            for i, s in enumerate(v):
                swing = sorted(s - common)
                out.append("      opt%d also has: %s" % (i + 1,
                           ", ".join(swing) if swing else "(nobody else)"))

    crows = []
    for e in EMPLOYEES:
        row = [info["counts"].get(e, 0) for _, info in options]
        if any(r != row[0] for r in row):
            crows.append("  %-10s %s" % (e, " -> ".join(map(str, row))))
    if crows:
        out.append("  weekly shift-count changes (opt1 -> ... -> opt%d):" % n)
        out.extend(crows)
    return "\n".join(out)


if __name__ == "__main__":
    cuts, options = [], []
    for i in range(3):
        res = build_and_solve(cuts)
        if res is None:
            print("No feasible schedule." if i == 0 else "No more distinct options.")
            break
        chosen, info = res
        options.append(res)
        print("=" * 66)
        print("OPTION %d   score=%.0f   UNFILLED SEATS=%d   shift-spread=%d"
              % (i + 1, info["objective"], info["unfilled"], info["spread"]))
        print(show(chosen))
        print("  shifts/person:", {k: v for k, v in sorted(info["counts"].items())})
        print("  score breakdown:", {k: v for k, v in info["breakdown"].items() if v}
              or "all zero", "| proven optimal" if info["optimal"] else "| time-limited")
        print(show_gaps(info["gaps"]))
        cuts.append(chosen)
    print(show_diff(options))
