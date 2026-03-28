const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the external ML service to compute a risk score.
 * @param {Object} payload - Data to send to the ML endpoint.
 * @returns {Promise<Object>} - Resolves with the response body from the ML service.
 * @throws {Error} - Throws structured error with statusCode 503 if ML is unreachable.
 */
const getRiskScore = async (payload) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/risk-score`, payload);
    return response.data;
  } catch (err) {
    const error = new Error('ML service unavailable');
    error.statusCode = 503;
    error.cause = err.message;
    throw error;
  }
};

module.exports = { getRiskScore };

