const express = require('express');
const router = express.Router();

const { protect, checkRole } = require('../middleware/authMiddleware');
const {
  initiatePayout,
  updatePayoutStatus,
  getPayoutById,
  getMyPayouts,
} = require('../controllers/payoutController');

// All payout routes require authentication
router.use(protect);

// POST /api/payout/initiate 
// Admin or internal Trigger Engine only
router.post('/initiate', checkRole('admin'), initiatePayout);

// GET /api/payout/me
// Get my payouts (worker)
router.get('/me', getMyPayouts);

// GET /api/payout/:payoutId
router.get('/:payoutId', getPayoutById);

// PATCH /api/payout/:payoutId/status
// Admin only updating state
router.patch('/:payoutId/status', checkRole('admin'), updatePayoutStatus);

module.exports = router;
