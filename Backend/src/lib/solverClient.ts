const SOLVER_URL = process.env.SOLVER_URL ?? 'http://localhost:8000';

export interface SolverAssignment {
  requirementId: number;
  employeeId: number;
}

export interface SolverGap {
  requirementId: number;
  kind: 'head' | 'senior' | 'open';
  shortBy: number;
}

export interface SolverResult {
  feasible: boolean;
  optimal: boolean;
  objective: number | null;
  assignments: SolverAssignment[];
  gaps: SolverGap[];
  stats: {
    shiftsPerEmployee?: Record<string, number>;
    spread?: number;
    unfilled?: number;
  };
}

export async function callSolver(payload: unknown): Promise<SolverResult> {
  let res: Response;
  try {
    res = await fetch(`${SOLVER_URL}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(
      `Could not reach the solver service at ${SOLVER_URL}. Is it running? (${(err as Error).message})`,
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Solver responded ${res.status}: ${text}`);
  }

  return res.json() as Promise<SolverResult>;
}
