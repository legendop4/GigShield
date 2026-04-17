const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  deliveriesCompleted: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound index optimises getUserActivities sort query
ActivityLogSchema.index({ userId: 1, timestamp: -1 });

const MongooseModel = mongoose.model('ActivityLog', ActivityLogSchema);
module.exports = require('../dbAdapter')('ActivityLog', MongooseModel);
