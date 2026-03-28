const express = require('express');
const router = express.Router();

const { protect, checkRole } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  getFraudFlags,
  overrideRiskScore,
} = require('../controllers/adminController');

// All admin routes are strictly protected and only for 'admin' role
router.use(protect, checkRole('admin'));

// GET /api/admin/users
router.get('/users', getAllUsers);

// GET /api/admin/fraud-flags
router.get('/fraud-flags', getFraudFlags);

// PATCH /api/admin/risk/:userId/override
router.patch('/risk/:userId/override', overrideRiskScore);

module.exports = router;
