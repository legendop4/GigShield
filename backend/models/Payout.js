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
}, { timestamps: true });

module.exports = mongoose.model('Payout', PayoutSchema);
