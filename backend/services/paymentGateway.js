/**
 * paymentGateway.js - Simulated payout processing via mock external gateway
 */
const crypto = require('crypto');

// --- FLASH CRASH CIRCUIT BREAKER MEMORY ---
const PAYOUT_HISTORY = [];
const FREEZE_THRESHOLD = 50000; // INR
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const isGlobalFreezeActive = (newAmount) => {
    const now = Date.now();
    // Prune history
    while (PAYOUT_HISTORY.length > 0 && PAYOUT_HISTORY[0].timestamp < now - WINDOW_MS) {
        PAYOUT_HISTORY.shift();
    }
    const currentSum = PAYOUT_HISTORY.reduce((acc, p) => acc + p.amount, 0);
    return (currentSum + newAmount) > FREEZE_THRESHOLD;
};

const simulatePayout = async (userId, amount, idempotencyKey = null) => {
  return new Promise((resolve) => {
    // CIRCUIT BREAKER CHECK
    if (isGlobalFreezeActive(amount)) {
        console.error(`[CIRCUIT BREAKER] Flash Crash Triggered! Blocked ${amount} INR payout.`);
        return resolve({ success: false, status: 'failed', transactionId: null, reason: 'GLOBAL_PAYOUT_FREEZE' });
    }
    
    // Log intent to history
    PAYOUT_HISTORY.push({ amount, timestamp: Date.now() });

    // Simulate gateway delay
    setTimeout(() => {
      let txSeed;
      if (idempotencyKey) {
        // Create a short hash of the idempotency key for determinism
        const hash = crypto.createHash('md5').update(idempotencyKey).digest('hex');
        txSeed = hash.substring(0, 8).toUpperCase();
      } else {
        txSeed = Math.floor(Math.random()*100000000).toString().padStart(8, '0');
      }

      const transactionId = `TXN_GS_${txSeed}_${userId.slice(-4)}`;
      resolve({
        success: true,
        transactionId,
        status: 'paid'
      });
    }, 800); // 800ms mock delay
  });
};

module.exports = { simulatePayout };
