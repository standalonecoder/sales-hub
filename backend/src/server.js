import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import numbersRouter from './routes/numbers.js';
import analyticsRouter from './routes/analytics.js';
import ghlRouter from './routes/ghl.js';
import closersRouter from './routes/closers.js';
import calendlyRouter from './routes/calendly.js';
import onboardingStepsRouter from './routes/onboarding-steps.js';
import whopRouter from './routes/whop.js';
import salesRouter from './routes/sales.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API routes
app.use('/api/numbers', numbersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ghl', ghlRouter);
app.use('/api/closers', closersRouter);
app.use('/api/calendly', calendlyRouter);
app.use('/api/onboarding', onboardingStepsRouter);
app.use('/api/whop', whopRouter);
app.use('/api/sales', salesRouter);

// Fallback 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Root message (optional)
app.get('/', (req, res) => {
  res.json({ message: 'Sales Hub API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;