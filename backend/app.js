const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const healthRoute = require('./routes/health');
const activityRoute = require('./routes/activity');
const riskRoute = require('./routes/risk');
const authRoute = require('./routes/auth');
const payoutRoute = require('./routes/payout');

const app = express();

// Middleware
app.use(express.json());          // JSON body parser
app.use(cors());                  // Enable CORS
app.use(helmet());                // Security headers
app.use(logger);                  // Request logging

// Routes
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api/activity', activityRoute);
app.use('/api/risk', riskRoute);
app.use('/api/payout', payoutRoute);

// 404 handler for unknown routes
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.statusCode = 404;
    next(err);
});

// Central error handler
app.use(errorHandler);

module.exports = app;
