import express, { type NextFunction, type Request, type Response, Router } from 'express';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import storeRoutes from './routes/stores.js';
import shiftRoutes from './routes/shifts.js';
import shiftRequirementRoutes from './routes/shiftRequirements.js';
import employeeStoreRoutes from './routes/employeeStores.js';
import availabilityRoutes from './routes/availability.js';
import scheduleRoutes from './routes/schedule.js';

const app = express();
const PORT = 3000;
app.use(express.json());

// everything the frontend calls lives under /api so it never collides with a
// client-side route (the Vite dev proxy forwards /api and nothing else)
const api = Router();
api.use('/auth', authRoutes);
api.use('/employees', employeeRoutes);
api.use('/stores', storeRoutes);
api.use('/shifts', shiftRoutes);
api.use('/shiftrequirements', shiftRequirementRoutes);
api.use('/employeeStores', employeeStoreRoutes);
api.use('/availability', availabilityRoutes);
api.use('/schedule', scheduleRoutes);
app.use('/api', api);

// last-resort JSON error handler so API clients never get an HTML error page
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
