// Load environment variables and expose them
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

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
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'd1101dfc3a7e3e0fb7c92df48297c48a801ea81096f8073052607fe9b1647d0f',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'gigshield_internal_dev_key_2024',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://localhost:5002',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'your-stripe-key',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '"GigShield <noreply@gigshield.in>"',
};
