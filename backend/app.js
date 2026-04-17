const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const { CORS_ORIGIN } = require('./config/env');
const healthRoute = require('./routes/health');
const activityRoute = require('./routes/activity');
const riskRoute = require('./routes/risk');
const authRoute = require('./routes/auth');
const payoutRoute = require('./routes/payout');
const adminRoute = require('./routes/admin');


const app = express();

// Middleware
app.use(express.json());          // JSON body parser
app.use(cors({                    // Restricted CORS
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(helmet({                  // Security headers + CSP
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https://api.dicebear.com", "https://openweathermap.org", "data:"],
      connectSrc: ["'self'", "ws://localhost:3000"],
    },
  },
}));
app.use(logger);                  // Request logging

// Global API rate limiter (Relaxed heavily for demo)
const rateLimit = require('express-rate-limit');
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 999999, // Disabled for Demo / Local usage
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// Routes
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api/activity', activityRoute);
app.use('/api/risk', riskRoute);
app.use('/api/payout', payoutRoute);
app.use('/api/admin', adminRoute);
app.use('/api/demo', require('./routes/demo'));
app.use('/api/weather', require('./routes/weather'));

// 404 handler for unknown routes
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.statusCode = 404;
    next(err);
});

// Central error handler
app.use(errorHandler);

module.exports = app;
