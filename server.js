const express = require('express');
const dotenv = require('dotenv');
const { applyMiddleware } = require('./middleware');
const accountsRouter = require('./routes/accounts');
const logsRouter = require('./routes/logs');
const statusRouter = require('./routes/status');
const settingsRouter = require('./routes/settings');
const warmupRouter = require('./routes/warmup');

dotenv.config();

const app = express();
applyMiddleware(app);

// Mount routes
app.use('/api/accounts', accountsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/status', statusRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/warmup', warmupRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});