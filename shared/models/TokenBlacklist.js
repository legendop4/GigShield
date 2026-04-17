const mongoose = require('mongoose');

const TokenBlacklistSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index: auto-delete after expiry
}, { timestamps: true });

const MongooseModel = mongoose.model('TokenBlacklist', TokenBlacklistSchema);
module.exports = require('../dbAdapter')('TokenBlacklist', MongooseModel);
