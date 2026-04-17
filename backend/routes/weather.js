const express = require('express');
const router = express.Router();
const { getWeatherData } = require('../services/weatherService');

/**
 * @desc   Get live weather + AQI data for a location
 * @route  GET /api/weather/:lat/:lng
 * @access Public (data is non-sensitive)
 */
router.get('/:lat/:lng', async (req, res, next) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      const err = new Error('lat and lng must be valid numbers');
      err.statusCode = 400;
      throw err;
    }

    const data = await getWeatherData(lat, lng);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc   Get weather for Delhi NCR default (demo)
 * @route  GET /api/weather
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await getWeatherData(); // Default: Delhi NCR
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
