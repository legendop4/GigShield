const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const RiskScore = require('../models/RiskScore');
const { getRiskScore } = require('../services/mlService');

/**
 * @desc   Compute and store risk score for a user
 * @route  POST /api/risk/score/:userId
 */
exports.computeRiskScore = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error('userId must be a valid ObjectId');
      err.statusCode = 400;
      throw err;
    }

    // 1. Retrieve activity count for the user
    const activityCount = await ActivityLog.countDocuments({ userId });

    // 2. Build ML input payload with numeric values
    const mlPayload = {
      userId,
      weather: 1,       // 1=clear, 2=rain, 3=storm (numeric proxy)
      traffic: 2,       // 1=low, 2=moderate, 3=heavy (numeric proxy)
      pollution: 1,     // 1=low, 2=medium, 3=high (numeric proxy)
      history: activityCount,
      isNewUser: activityCount === 0,
    };

    // 3. Call ML service — isolated catch returns 503 on failure
    let mlResult;
    try {
      mlResult = await getRiskScore(mlPayload);
    } catch (mlErr) {
      const err = new Error('ML service unavailable — risk scoring failed');
      err.statusCode = 503;
      throw err;
    }

    const { risk_score } = mlResult;

    // 4. Store result with full auditable factors
    const riskRecord = await RiskScore.create({
      userId,
      score: risk_score,
      factors: {
        weather: mlPayload.weather,
        traffic: mlPayload.traffic,
        pollution: mlPayload.pollution,
        history: mlPayload.history,
        activityCount,
        isNewUser: mlPayload.isNewUser,
      },
    });

    // 5. Return response
    res.json({ success: true, risk_score: riskRecord.score });
  } catch (err) {
    next(err);
  }
};

