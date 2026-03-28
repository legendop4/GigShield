const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from the token and attach to req
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        const err = new Error('Not authorized, user not found');
        err.statusCode = 401;
        return next(err);
      }

      next();
    } catch (err) {
      console.error('🛑 Token verification failed:', err);
      const error = new Error('Not authorized, token failed');
      error.statusCode = 401;
      return next(error);   // ← return prevents fall-through to else block
    }
  } else {
    // No Authorization header at all
    const err = new Error('Not authorized, no token');
    err.statusCode = 401;
    return next(err);
  }
};

/**
 * Middleware to restrict access based on user role
 * @param {...string} roles - Allowed roles
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error(`User role ${req.user.role} is not authorized to access this route`);
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
};

module.exports = { protect, checkRole };
