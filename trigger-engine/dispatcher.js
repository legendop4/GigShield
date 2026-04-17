/**
 * dispatcher.js — Sends payout requests to the Backend API
 *
 * Uses INTERNAL_API_KEY for service-to-service authentication.
 * Does NOT retry on failure — failed payouts are logged and
 * will be re-evaluated on the next cron cycle.
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const DEFAULT_PAYOUT_AMOUNT = parseFloat(process.env.DEFAULT_PAYOUT_AMOUNT) || 500;

/**
 * Dispatch a payout request to the Backend API.
 * @param {Object} action - { userId, riskScore, idempotencyKey }
 * @returns {Object} - { success, userId, payoutId?, error? }
 */
async function dispatchPayout(action) {
  const { userId, riskScore, idempotencyKey } = action;

  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/payout/initiate`,
      {
        userId,
        amount: DEFAULT_PAYOUT_AMOUNT,
        triggerType: 'automated_risk',
        idempotencyKey,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': INTERNAL_API_KEY,
        },
        timeout: 10000, // 10s timeout
      }
    );

    console.log(`[PAYOUT] User ${userId}: Score=${riskScore} -> Payout initiated (${response.data.data?._id || 'OK'})`);
    return { success: true, userId, payoutId: response.data.data?._id };
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message;

    // 200 from idempotency = already processed, treat as success
    if (status === 200) {
      console.log(`[PAYOUT] User ${userId}: Already processed (idempotency match)`);
      return { success: true, userId, note: 'idempotency_match' };
    }

    // 403 = fraud flag caught by backend (double safety net)
    if (status === 403) {
      console.log(`[BLOCKED] User ${userId}: Backend blocked payout — ${message}`);
      return { success: false, userId, error: message, blocked: true };
    }

    // Any other error: log and skip (retry on next cycle)
    console.error(`[FAILED] User ${userId}: Payout dispatch failed — ${message}`);
    return { success: false, userId, error: message };
  }
}

module.exports = { dispatchPayout };
