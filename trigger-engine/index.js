/**
 * index.js — GigShield Trigger Engine Entry Point
 *
 * This is a standalone Node.js process that:
 *   1. Connects to the same MongoDB as the backend
 *   2. Runs a cron job to evaluate workers' risk scores
 *   3. Dispatches automated income-protection payouts via the Backend API
 *
 * Run:
 *   node index.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { startScheduler } = require('./scheduler');

async function start() {
  // 🔄 SYNC: Wait for Backend to initialize the in-memory DB (Audit Mode)
  let MONGO_URI = process.env.MONGO_URI || '';
  const syncPath = path.join(__dirname, '../.env.local');
  
  if (MONGO_URI && MONGO_URI.includes('localhost')) {
    console.log('[ENGINE] Audit mode detected. Waiting for Backend sync (5s)...');
    await new Promise(r => setTimeout(r, 5000));
    
    if (fs.existsSync(syncPath)) {
      const syncContent = fs.readFileSync(syncPath, 'utf8');
      const match = syncContent.match(/MONGO_URI=(.+)/);
      if (match) {
        MONGO_URI = match[1].trim();
        console.log('[ENGINE] Using synced in-memory URI:', MONGO_URI);
      }
    }
  }

  if (!MONGO_URI || MONGO_URI === 'undefined') {
    console.warn('[ENGINE] MONGO_URI is missing. Deferring execution to Backend fallback mode.');
    return; // Exit gracefully
  }

  if (!process.env.INTERNAL_API_KEY) {
    console.error('FATAL: INTERNAL_API_KEY is not set in .env');
    process.exit(1);
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 10000, 20000]; // ms

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[ENGINE] Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})...`);
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
      console.log('[ENGINE] MongoDB connection verified.');
      startScheduler();
      return; // success — exit the retry loop
    } catch (err) {
      console.error(`[ENGINE] Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        console.log(`[ENGINE] Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error('[ENGINE] All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[ENGINE] Shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[ENGINE] Shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

start();
