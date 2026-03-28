const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  trustScore: { type: Number, default: 0.5 },
  role: { type: String, enum: ['worker', 'admin'], default: 'worker' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
