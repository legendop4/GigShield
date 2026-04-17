const rateLimit = require('express-rate-limit');

/**
 * General auth rate limiter (Relaxed for demo)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

/**
 * OTP rate limiter (Relaxed for demo)
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP attempts. Please wait before retrying.' },
});

module.exports = { authLimiter, otpLimiter };
