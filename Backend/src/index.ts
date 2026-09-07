import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response, Router } from 'express';
import authRoutes from './routes/auth.js';
import changeRequestRoutes from './routes/changeRequests.js';
import employeeRoutes from './routes/employees.js';
import managerRoutes from './routes/managers.js';
import overviewRoutes from './routes/overview.js';
import storeRoutes from './routes/stores.js';
import shiftRoutes from './routes/shifts.js';
import shiftRequirementRoutes from './routes/shiftRequirements.js';
import employeeStoreRoutes from './routes/employeeStores.js';
import availabilityRoutes from './routes/availability.js';
import scheduleRoutes from './routes/schedule.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());

// everything the frontend calls lives under /api so it never collides with a
// client-side route (the Vite dev proxy forwards /api and nothing else)
const api = Router();
api.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));
api.use('/auth', authRoutes);
api.use('/employees', employeeRoutes);
api.use('/stores', storeRoutes);
api.use('/shifts', shiftRoutes);
api.use('/shiftrequirements', shiftRequirementRoutes);
api.use('/employeeStores', employeeStoreRoutes);
api.use('/availability', availabilityRoutes);
api.use('/schedule', scheduleRoutes);
api.use('/change-requests', changeRequestRoutes);
api.use('/managers', managerRoutes);
api.use('/overview', overviewRoutes);
app.use('/api', api);

// In production the built frontend is served from this same origin (the app
// calls /api with no host, see Frontend/src/lib/api.ts). In dev the Vite server
// serves the SPA and proxies /api here, so this block is simply skipped.
const distDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  process.env.FRONTEND_DIST ?? '../../Frontend/dist',
);
if (existsSync(distDir)) {
  const indexHtml = join(distDir, 'index.html');
  app.use(express.static(distDir));
  // SPA fallback: any non-/api GET that didn't match a file returns index.html
  // so client-side routes (/schedule, /my-shifts, …) work on a hard refresh.
  app.get(/^\/(?!api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(indexHtml);
  });
  console.log('Serving frontend from', distDir);
} else {
  console.log('No frontend build at', distDir, '— API only (expected in dev)');
}

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
