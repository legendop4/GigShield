const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

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

const MONGO_URI = env.MONGO_URI;

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
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");

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
      delete uData.type;
      await User.create(uData);

      // Seed Activity
      const now = new Date();
      if (type === 'legit' || type === 'high-risk') {
        // Consistent activity (every hour for 5 hours)
        for (let i = 5; i > 0; i--) {
          await ActivityLog.create({
            userId: uData._id,
            location: { lat: 28.7041, lng: 77.1025 },
            deliveriesCompleted: 2,
            timestamp: new Date(now.getTime() - (i * 3600000))
          });
        }
      } else if (type === 'suspicious') {
        // Only 1 activity entry in the last month (No history)
        await ActivityLog.create({
          userId: uData._id,
          location: { lat: 28.7041, lng: 77.1025 },
          deliveriesCompleted: 1,
          timestamp: new Date(now.getTime() - (86400000 * 10))
        });
      } else if (type === 'fraud') {
        // Impossible telemetry: 2 activities in 5 mins but locations are 500 miles apart
        await ActivityLog.create({
          userId: uData._id,
          location: { lat: 28.7041, lng: 77.1025 }, // Delhi
          deliveriesCompleted: 1,
          timestamp: new Date(now.getTime() - 600000) // 10 mins ago
        });
        await ActivityLog.create({
          userId: uData._id,
          location: { lat: 19.0760, lng: 72.8777 }, // Mumbai
          deliveriesCompleted: 1,
          timestamp: new Date(now.getTime() - 300000) // 5 mins ago
        });

        // Set fraud flag explicitly
        await FraudFlag.create({
          userId: uData._id,
          score: 0.99,
          reason: "Impossible telemetry detected (>500mph movement)",
          status: "open"
        });
      }

      // Base risk score (stable)
      await RiskScore.create({
        userId: uData._id,
        score: 0.1,
        factors: { weather: 1, traffic: 1, pollution: 1 }
      });
    }

    console.log("✅ Determined State Seed Sequence Complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
