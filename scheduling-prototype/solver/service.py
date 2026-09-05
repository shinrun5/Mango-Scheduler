"""
FastAPI wrapper around engine.solve().

Run (from scheduling-prototype/):
    .venv/bin/uvicorn solver.service:app --reload --port 8000

The Express backend calls POST /solve with the payload built from the DB.
"""

from fastapi import FastAPI
from pydantic import BaseModel

from .engine import solve

app = FastAPI(title="Scheduler Solver", version="0.1.0")


class EmployeeStore(BaseModel):
    storeId: int
    tier: str = "REGULAR"
    canOpen: bool = False


class Employee(BaseModel):
    id: int
    name: str = ""
    hourLimit: int | None = None
    maxShifts: int | None = None
    stores: list[EmployeeStore] = []


class Availability(BaseModel):
    employeeId: int
    day: str
    start: str  # "HH:MM" 24h
    end: str


class Requirement(BaseModel):
    id: int
    storeId: int
    day: str
    start: str  # "HH:MM" 24h
    end: str
    head: int = 1
    seniorMin: int = 0
    needOpen: bool = False
    allowNew: bool = True
    graceMinutes: int = 0  # availability may begin this many min after `start` and still count


class SolveRequest(BaseModel):
    employees: list[Employee]
    availability: list[Availability] = []
    requirements: list[Requirement]
    solveSeconds: float = 5.0


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/solve")
def solve_endpoint(req: SolveRequest) -> dict:
    return solve(req.model_dump())
