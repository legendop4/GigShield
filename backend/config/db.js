const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  if (MONGO_URI && MONGO_URI !== 'undefined') {
    const maskedUri = MONGO_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
    console.log(`📡 Attempting connection: ${maskedUri}`);
    
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('⚠️ Falling back to Native JS In-Memory Database.');
    }
  } else {
    console.log('⚠️ MONGO_URI missing. Falling back to Native JS In-Memory Database.');
  }

  // Fallback Mode (Seed Native DB)
  console.log('🔥 Native JS In-Memory Database active (Fallback mode)');
  try {
    const { resetDemoState } = require('../controllers/demoController');
    await resetDemoState({}, { 
        json: (data) => console.log('🌱 Ephemeral Native Demo State seeded:', data.message),
        status: () => ({ json: (err) => console.error(err) })
    }, () => {});
  } catch(e) { console.error('Seed error:', e) }
};

module.exports = connectDB;
