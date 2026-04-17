const mongoose = require('mongoose');
const ActivityLog = require('../../shared/models/ActivityLog');
const RiskScore = require('../../shared/models/RiskScore');
const { getRiskScore } = require('../services/mlService');
const { getWeatherData } = require('../services/weatherService');

/**
 * @desc   Compute and store risk score for a user (with live weather)
 * @route  POST /api/risk/score/:userId
 */
exports.computeRiskScore = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { lat, lng } = req.body; // Optional GPS from frontend

    // 1. Retrieve activity count for the user
    const activityCount = await ActivityLog.countDocuments({ userId });

    // 2. Fetch LIVE weather data from OpenWeather
    const weather = await getWeatherData(lat || 28.7041, lng || 77.1025);

    // 3. Build ML input payload with REAL environmental data
    const mlPayload = {
      userId,
      weather: weather.weatherRisk,       // 1-10 from live OpenWeather
      traffic: 2,                          // TODO: integrate traffic API
      pollution: weather.pollutionRisk,    // 1-10 from live AQI
      history: activityCount,
      isNewUser: activityCount === 0,
    };

    // 4. Call ML service — isolated catch returns 503 on failure
    let mlResult;
    try {
      mlResult = await getRiskScore(mlPayload);
    } catch (mlErr) {
      const err = new Error('ML service unavailable — risk scoring failed');
      err.statusCode = 503;
      throw err;
    }

    const { risk_score } = mlResult;
    
    // Explicitly validate ML output
    if (typeof risk_score !== 'number') {
      const err = new Error('ML returned an invalid payload missing risk_score');
      err.statusCode = 502;
      throw err;
    }

    // 5. Store result with full auditable factors including weather
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
        weatherCondition: weather.condition,
        weatherTemp: weather.temp,
        weatherCity: weather.city,
        weatherSource: weather.source,
      },
    });

    // 6. Return response with weather context
    res.json({ 
      success: true, 
      risk_score: riskRecord.score,
      weather: {
        condition: weather.condition,
        description: weather.description,
        temp: weather.temp,
        city: weather.city,
        weatherRisk: weather.weatherRisk,
        pollutionRisk: weather.pollutionRisk,
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get the latest risk score for a user
 * @route  GET /api/risk/latest/:userId
 */
exports.getLatestRiskScore = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const latestRisk = await RiskScore.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestRisk) {
      return res.json({ success: true, risk_score: 0 }); // Default for new users
    }

    res.json({ success: true, risk_score: latestRisk.score });
  } catch (err) {
    next(err);
  }
};

