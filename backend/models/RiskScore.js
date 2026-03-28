const mongoose = require('mongoose');

const RiskScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, required: true },
  factors: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('RiskScore', RiskScoreSchema);
