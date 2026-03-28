const User = require('../models/User');
const FraudFlag = require('../models/FraudFlag');
const RiskScore = require('../models/RiskScore');
const { sendNotification } = require('../services/notificationService');

/**
 * @desc   Get all users (paginated)
 * @route  GET /api/admin/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find()
      .select('-password') // Ensure no sensitive data leak if password field is added later
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all fraud flags with optional status filter
 * @route  GET /api/admin/fraud-flags
 */
exports.getFraudFlags = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // Build query object
    const query = {};
    if (status) query.status = status;

    const flags = await FraudFlag.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: flags.length, data: flags });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Manually override a user's risk score
 * @route  PATCH /api/admin/risk/:userId/override
 */
exports.overrideRiskScore = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newScore, reason } = req.body;

    if (newScore === undefined || typeof newScore !== 'number' || newScore < 0 || newScore > 100) {
      const err = new Error('A valid newScore between 0 and 100 is required');
      err.statusCode = 400;
      throw err;
    }

    if (!reason || typeof reason !== 'string') {
      const err = new Error('A reason string is required for an audit log');
      err.statusCode = 400;
      throw err;
    }

    // Insert a new record to the risk score history to document the admin override
    const updatedRisk = await RiskScore.create({
      userId,
      score: newScore,
      factors: {
        override: true,
        reason,
        adminId: req.user.id, 
        timestamp: new Date().toISOString()
      }
    });

    // Notify the user about the risk score adjustment
    await sendNotification(
      userId,
      'Risk Score Adjusted',
      `Your platform trust score has been manually reviewed and adjusted.`,
      'system'
    );

    res.json({ success: true, data: updatedRisk });
  } catch (err) {
    next(err);
  }
};
