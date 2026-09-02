from ortools.sat.python import cp_model

model = cp_model.CpModel()

alice = model.NewBoolVar('alice_works_monday_night')  # senior
bob = model.NewBoolVar('bob_works_monday_night')      # regular
carol = model.NewBoolVar('carol_works_monday_night') 

manager = alice.proficiency();

model.add(manager >= 1, senior >= 1, regular >= 1, new <= 1);

solver = cp_model.CpSolver()
status = solver.Solve(model)