// Load environment variables and expose them
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

// Fail fast if JWT_SECRET is missing in non-development environments
if (!process.env.JWT_SECRET && NODE_ENV !== 'development') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

if (!process.env.JWT_SECRET && NODE_ENV === 'development') {
  console.warn('⚠️  WARNING: JWT_SECRET not set — using insecure default. Do NOT use in production.');
}

module.exports = {
  NODE_ENV,
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-insecure-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};
