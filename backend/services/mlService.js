const axios = require('axios');
const { AI_ENGINE_URL } = require('../config/env');
const { computeLiteRiskScore } = require('./liteRiskService');

/**
 * Calls the ML service or falls back to lite logic if unconfigured.
 */
const getRiskScore = async (payload) => {
  // 1. If AI_ENGINE_URL is missing, use the Lite Evaluator (Free Tier Mode)
  if (!AI_ENGINE_URL) {
    const score = computeLiteRiskScore(payload);
    return { risk_score: score, userId: payload.userId };
  }

  // 2. Otherwise, attempt to call the external Python ML service
  try {
    // Map Project A's simplistic payload to the massive Project B AI Model payload
    const mlPayload = {
       latitude: 28.7041,           // Defaults to Delhi NCR for Demo Trigger compatibility
       longitude: 77.1025,
       daily_income: 1000.0,
       target_date: new Date().toISOString().split('T')[0],
       no_claim_weeks: payload.history > 3 ? 2 : 0,
       active_days_last_30_days: payload.history * 4    
    };

    const response = await axios.post(`${AI_ENGINE_URL}/premium`, mlPayload);
    const data = response.data;
    
    // Convert string risk (from XGBoost) to numeric format that Express expects
    let score = 0.2;
    if (data.disruption_risk === 'extreme' || data.disruption_risk === 'high') score = 0.95;
    else if (data.disruption_risk === 'moderate') score = 0.65;
    
    return { risk_score: score, userId: payload.userId, raw_ai_metrics: data };
  } catch (err) {
    // If external ML fails, we log it and throw 503
    const error = new Error('ML service unavailable');
    error.statusCode = 503;
    error.cause = err.message;
    throw error;
  }
};

module.exports = { getRiskScore };
