const mongoose = require('mongoose');
const Payout = require('../../shared/models/Payout');
const FraudFlag = require('../../shared/models/FraudFlag');
const { simulateGateway, simulatePayout } = require('../services/paymentGateway');
const socketService = require('../services/socketService');

/**
 * @desc   Initiate a new parametric payout (Trigger Engine / Admin)
 * @route  POST /api/payout/initiate
 */
exports.initiatePayout = async (req, res, next) => {
  try {
    const { userId, amount, triggerType } = req.body;

    if (!userId) {
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

    // Idempotency: Prevent duplicate payouts from duplicate webhook triggers
    const { idempotencyKey } = req.body;
    if (idempotencyKey) {
      const duplicate = await Payout.findOne({ idempotencyKey });
      if (duplicate) {
         return res.status(200).json({ 
           success: true, 
           message: 'Idempotency key matched. Payout already processing', 
           data: duplicate 
         });
      }
    }

    let payout = await Payout.create({
      userId,
      amount,
      triggerType: triggerType || 'manual',
      status: 'pending',
      idempotencyKey,
      reason: 'Risk automated execution check passed'
    });

    // Simulated Gateway Call
    const gatewayRes = await simulatePayout(userId.toString(), amount, idempotencyKey);
    if (gatewayRes.success) {
      payout.status = 'paid';
      payout.transactionId = gatewayRes.transactionId;
      await payout.save();

      // Notify the user in real-time
      try {
        const io = socketService.getIO();
        io.to(userId.toString()).emit('payout_triggered', {
          amount: payout.amount,
          transactionId: payout.transactionId,
          reason: payout.reason || 'Risk automated execution check passed'
        });
      } catch (err) {
        console.error("Socket emission failed:", err.message);
      }
    }

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
    const payoutOwnerId = payout.userId?._id?.toString() || payout.userId?.toString();
    const requesterId = req.user._id?.toString() || req.user.id;
    if (req.user.role !== 'admin' && payoutOwnerId !== requesterId) {
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
    const userId = req.user._id || req.user.id;
    const payouts = await Payout.find({ userId }).sort({ createdAt: -1 });

    res.json({ success: true, count: payouts.length, data: payouts });
  } catch (err) {
    next(err);
  }
};
