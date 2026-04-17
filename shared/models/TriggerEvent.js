const mongoose = require('mongoose');

const TriggerEventSchema = new mongoose.Schema({
  cycleId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  riskScore: { type: Number, required: true },
  decision: {
    type: String,
    enum: ['payout_initiated', 'payout_failed', 'blocked_fraud', 'skipped_cooldown', 'skipped_idempotency'],
    required: true,
  },
  idempotencyKey: { type: String },
  payoutId: { type: String },
  errorMessage: { type: String },
}, { timestamps: true });

const MongooseModel = mongoose.model('TriggerEvent', TriggerEventSchema);
module.exports = require('../dbAdapter')('TriggerEvent', MongooseModel);
