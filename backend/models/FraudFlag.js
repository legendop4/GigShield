const mongoose = require('mongoose');

const FraudFlagSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'dismissed'],
    default: 'open',
  },
}, { timestamps: true });

module.exports = mongoose.model('FraudFlag', FraudFlagSchema);
