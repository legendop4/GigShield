const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
