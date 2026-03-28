const mongoose = require('mongoose');
const Payout = require('../models/Payout');
const FraudFlag = require('../models/FraudFlag');

/**
 * @desc   Initiate a new parametric payout (Trigger Engine / Admin)
 * @route  POST /api/payout/initiate
 */
exports.initiatePayout = async (req, res, next) => {
  try {
    const { userId, amount, triggerType } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error('Valid userId is required');
      err.statusCode = 400;
      throw err;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      const err = new Error('A positive amount is required');
      err.statusCode = 400;
      throw err;
    }

    // Guard: Prevent payout if the worker has an 'open' or 'investigating' Fraud Flag
    const activeFraud = await FraudFlag.findOne({ 
      userId, 
      status: { $in: ['open', 'investigating'] } 
    });
    
    if (activeFraud) {
      const err = new Error('Cannot initiate payout: Worker has active fraud flags');
      err.statusCode = 403;
      throw err;
    }

    const payout = await Payout.create({
      userId,
      amount,
      triggerType: triggerType || 'manual',
      status: 'pending',
    });

    res.status(201).json({ success: true, data: payout });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update the status of a payout (pending -> approved -> paid | failed)
 * @route  PATCH /api/payout/:payoutId/status
 */
exports.updatePayoutStatus = async (req, res, next) => {
  try {
    const { payoutId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['approved', 'paid', 'failed'];
    if (!status || !allowedStatuses.includes(status)) {
      const err = new Error(`Status must be one of: ${allowedStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const payout = await Payout.findById(payoutId);
    if (!payout) {
      const err = new Error('Payout not found');
      err.statusCode = 404;
      throw err;
    }

    // Optionally enforce state machine order:
    // e.g., cannot transition straight from pending to paid without approved
    if (payout.status === 'paid' || payout.status === 'failed') {
      const err = new Error(`Payout is already ${payout.status} and cannot be changed`);
      err.statusCode = 400;
      throw err;
    }

    payout.status = status;
    await payout.save();

    res.json({ success: true, data: payout });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get specific payout details
 * @route  GET /api/payout/:payoutId
 */
exports.getPayoutById = async (req, res, next) => {
  try {
    const { payoutId } = req.params;

    const payout = await Payout.findById(payoutId).populate('userId', 'name email phone');
    if (!payout) {
      const err = new Error('Payout not found');
      err.statusCode = 404;
      throw err;
    }

    // Role Guard: Only admins or the owner can view this payout
    if (req.user.role !== 'admin' && payout.userId._id.toString() !== req.user.id) {
      const err = new Error('Not authorized to view this payout');
      err.statusCode = 403;
      throw err;
    }

    res.json({ success: true, data: payout });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all payouts for the currently authenticated user
 * @route  GET /api/payout/me
 */
exports.getMyPayouts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payouts = await Payout.find({ userId }).sort({ createdAt: -1 });

    res.json({ success: true, count: payouts.length, data: payouts });
  } catch (err) {
    next(err);
  }
};
