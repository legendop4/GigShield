const express = require('express');
const router = express.Router();

const {
  createActivity,
  getUserActivities,
} = require('../controllers/activityController');

// POST /api/activity
router.post('/', createActivity);

// GET /api/activity/:userId
router.get('/:userId', getUserActivities);

module.exports = router;
