import express from 'express';
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

app.use('/employees', employeeRoutes);
app.use('/stores', storeRoutes);
app.use('/shifts', shiftRoutes);
app.use('/shiftrequirements', shiftRequirementRoutes);
app.use('/employeeStores', employeeStoreRoutes);
app.use('/availability', availabilityRoutes);
app.use('/schedule', scheduleRoutes);

app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});