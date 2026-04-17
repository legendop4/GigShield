const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'failed'],
    default: 'pending',
  },
  triggerType: { type: String },
  idempotencyKey: { type: String, unique: true, sparse: true },
  transactionId: { type: String },
  reason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payout', PayoutSchema);
