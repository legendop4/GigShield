const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dns').setDefaultResultOrder('ipv4first');

const envPathLocal = path.join(__dirname, '../.env.local');
const envPathCore = path.join(__dirname, '.env');

let envContent = '';
if (fs.existsSync(envPathLocal)) {
    envContent = fs.readFileSync(envPathLocal, 'utf8');
} else {
    envContent = fs.readFileSync(envPathCore, 'utf8');
}

const env = {};
envContent.split('\n').forEach(line => {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) return;
  const key = line.slice(0, eqIdx).trim();
  const value = line.slice(eqIdx + 1).trim();
  if (key) env[key] = value;
});

const MONGO_URI = process.env.MONGO_URI || env.MONGO_URI;

const User = require('../shared/models/User');
const ActivityLog = require('../shared/models/ActivityLog');
const RiskScore = require('../shared/models/RiskScore');
const FraudFlag = require('../shared/models/FraudFlag');
const Payout = require('../shared/models/Payout');

const DEMO_USERS = [
  {
    _id: new mongoose.Types.ObjectId("6605a2e5c1d2e3f4a0000001"),
    name: "Shivam (Perfect Pilot)",
    email: "shivam@gigshield.ai",
    phone: "+919999999901",
    trustScore: 0.99,
    isPremium: true, tier: 'sentinel',
    type: "legit",
    otp: "123456",
    otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  },
  {
    _id: new mongoose.Types.ObjectId("6605a2e5c1d2e3f4a0000002"),
    name: "High-Risk Node",
    email: "risk@gigshield.ai",
    phone: "+919876543202",
    trustScore: 0.85,
    isPremium: true, tier: 'sentinel',
    type: "high-risk",
    otp: "123456",
    otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  },
  {
    _id: new mongoose.Types.ObjectId("6605a2e5c1d2e3f4a0000003"),
    name: "Suspicious Pattern",
    email: "suspicious@gigshield.ai",
    phone: "+919876543203",
    trustScore: 0.40,
    isPremium: true, tier: 'sentinel',
    type: "suspicious",
    otp: "123456",
    otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  },
  {
    _id: new mongoose.Types.ObjectId("6605a2e5c1d2e3f4a0000004"),
    name: "Fraudulent Actor",
    email: "fraud@gigshield.ai",
    phone: "+919876543204",
    trustScore: 0.10,
    isPremium: true, tier: 'sentinel',
    type: "fraud",
    otp: "123456",
    otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }
];

async function seed() {
  try {
    console.log("Starting cloud-optimized seeding...");

    // 1. Wipe previous state for these specific users
    const userIds = DEMO_USERS.map(u => u._id);
    await User.deleteMany({ _id: { $in: userIds } });
    await ActivityLog.deleteMany({ userId: { $in: userIds } });
    await RiskScore.deleteMany({ userId: { $in: userIds } });
    await FraudFlag.deleteMany({ userId: { $in: userIds } });
    await Payout.deleteMany({ userId: { $in: userIds } });

    console.log("Cleared old demo state.");

    // 2. Create Users
    for (const uData of DEMO_USERS) {
      const type = uData.type;
      const uToCreate = { ...uData };
      delete uToCreate.type;
      await User.create(uToCreate);

      // Seed Activity
      const now = new Date();
      if (type === 'legit' || type === 'high-risk') {
        for (let i = 5; i > 0; i--) {
          await ActivityLog.create({
            userId: uData._id,
            location: { lat: 28.7041, lng: 77.1025 },
            deliveriesCompleted: 2,
            timestamp: new Date(now.getTime() - (i * 3600000))
          });
        }
      } else if (type === 'suspicious') {
        await ActivityLog.create({
          userId: uData._id,
          location: { lat: 28.7041, lng: 77.1025 },
          deliveriesCompleted: 1,
          timestamp: new Date(now.getTime() - (86400000 * 10))
        });
      } else if (type === 'fraud') {
        await ActivityLog.create({
          userId: uData._id,
          location: { lat: 28.7041, lng: 77.1025 },
          deliveriesCompleted: 1,
          timestamp: new Date(now.getTime() - 600000)
        });
        await ActivityLog.create({
          userId: uData._id,
          location: { lat: 19.0760, lng: 72.8777 },
          deliveriesCompleted: 1,
          timestamp: new Date(now.getTime() - 300000)
        });

        await FraudFlag.create({
          userId: uData._id,
          score: 0.99,
          reason: "Impossible telemetry detected (>500mph movement)",
          status: "open"
        });
      }

      await RiskScore.create({
        userId: uData._id,
        score: 0.1,
        factors: { weather: 1, traffic: 1, pollution: 1 }
      });
    }

    console.log("✅ Seeding sequence complete.");
    return true;
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    throw err;
  }
}

module.exports = { seed, DEMO_USERS };

// Allow running standalone if needed
if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || env.MONGO_URI;
  if (!MONGO_URI) { console.error("MONGO_URI missing"); process.exit(1); }
  mongoose.connect(MONGO_URI).then(() => seed().then(() => process.exit(0)));
}
