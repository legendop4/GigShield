const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['risk_alert', 'payout', 'fraud_flag', 'system'],
    default: 'system',
  },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
