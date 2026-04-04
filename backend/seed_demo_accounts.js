const mongoose = require('mongoose');
const path = require('path');
const User = require('../shared/models/User');
const Payout = require('../shared/models/Payout');
const ActivityLog = require('../shared/models/ActivityLog');
const FraudFlag = require('../shared/models/FraudFlag');
const RiskScore = require('../shared/models/RiskScore');

// ✅ SECRET REMOVED: Now using environment variables for security.
const MONGO_URI = process.env.MONGO_URI;

const DEMO_DATA = [
  {
    user: {
      name: "Shivam (Safe Worker)",
      email: "shivam@gigshield.ai",
      phone: "+919999999901",
      trustScore: 0.98,
      isPremium: true, tier: 'sentinel',
      otp: "123456",
      otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    payouts: [
      { amount: 850, reason: "Heatwave Recovery", status: "completed", date: -15 },
      { amount: 1200, reason: "Rainfall Protection", status: "completed", date: -5 }
    ],
    activities: 20 // 20 days of safe logs
  },
  {
    user: {
      name: "Risk-Prone Driver",
      email: "risk@gigshield.ai",
      phone: "+919999999902",
      trustScore: 0.65,
      isPremium: true, tier: 'sentinel',
      otp: "123456",
      otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    payouts: [],
    activities: 5
  },
  {
    user: {
      name: "Flagged Account",
      email: "fraud@gigshield.ai",
      phone: "+919999999903",
      trustScore: 0.12,
      isPremium: false,
      otp: "123456",
      otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    fraud: { reason: "Impossible telemetry: Delhi to Mumbai in 5 minutes", score: 0.99 },
    activities: 2
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to Atlas for seeding...");

    // Clear previous demo accounts
    await User.deleteMany({ email: { $in: DEMO_DATA.map(d => d.user.email) } });

    for (const data of DEMO_DATA) {
      const user = await User.create(data.user);
      console.log(`Created user: ${user.email}`);

      // Seed Payouts
      for (const p of data.payouts) {
        await Payout.create({
          userId: user._id,
          amount: p.amount,
          reason: p.reason,
          status: p.status,
          createdAt: new Date(Date.now() + p.date * 24 * 60 * 60 * 1000)
        });
      }

      // Seed Activities (Daily logs)
      for (let i = 0; i < data.activities; i++) {
        await ActivityLog.create({
          userId: user._id,
          location: { lat: 28.6139, lng: 77.2090 },
          deliveriesCompleted: Math.floor(Math.random() * 5) + 2,
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        });
      }

      // Seed Fraud if applicable
      if (data.fraud) {
        await FraudFlag.create({
          userId: user._id,
          reason: data.fraud.reason,
          score: data.fraud.score,
          status: "open"
        });
      }

      // Seed Base Risk Score
      await RiskScore.create({
        userId: user._id,
        score: user.trustScore > 0.8 ? 0.05 : 0.45,
        factors: { weather: 1, traffic: 1, pollution: 1 }
      });
    }

    console.log("✅ Seeding Complete! Use OTP '123456' for any of these accounts.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
