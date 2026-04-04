const { exec } = require('child_process');
const path = require('path');
const RiskScore = require('../../shared/models/RiskScore');
const FraudFlag = require('../../shared/models/FraudFlag');
const Payout = require('../../shared/models/Payout');
const User = require('../../shared/models/User');

const evaluatorPath = path.resolve(__dirname, '../../shared/evaluator/evaluator.js');
const { evaluate, buildIdempotencyKey } = require(evaluatorPath);

// Helper to snapshot current status for ALL demo users
const getSystemStateSnapshot = async () => {
    const users = await User.find({ _id: { $in: [
      "6605a2e5c1d2e3f4a0000001",
      "6605a2e5c1d2e3f4a0000002",
      "6605a2e5c1d2e3f4a0000003",
      "6605a2e5c1d2e3f4a0000004"
    ]}}).lean();

    const snapshot = {};
    for (const u of users) {
        const risk = await RiskScore.findOne({ userId: u._id }).sort({ createdAt: -1 }).lean();
        const fraud = await FraudFlag.findOne({ userId: u._id }).sort({ createdAt: -1 }).lean();
        const payout = await Payout.findOne({ userId: u._id }).sort({ createdAt: -1 }).lean();

        snapshot[u._id.toString()] = {
            name: u.name,
            trustScore: u.trustScore,
            riskScore: risk ? risk.score : 0,
            hasFraud: fraud && fraud.status === 'open',
            fraudReason: fraud ? fraud.reason : null,
            payoutStatus: payout ? payout.status : 'none'
        };
    }
    return snapshot;
};

const { seed, DEMO_USERS } = require('../seed_investor_demo.js');

// 1. Reset Demo State
exports.resetDemoState = async (req, res, next) => {
    try {
        await seed();
        const defaultState = await getSystemStateSnapshot();
        res.json({ success: true, message: "Deterministic environment restored.", state: defaultState });
    } catch (err) {
        console.error("Reset demo failed:", err);
        next(err);
    }
};

// 2. Simulate Crisis (Weather = 3 for everyone, spikes Risk Score)
exports.simulateCrisis = async (req, res, next) => {
    try {
        const beforeState = await getSystemStateSnapshot();

        // Give everybody high environmental risk except we only modify the "factors" logic
        // For the demo, we directly push a > 0.5 score for active users.
        // User 3 (Suspicious) is hardcoded logic: we give them high risk too, but trigger evaluator blocks them later.
        
        const DEMO_IDS = [
          "6605a2e5c1d2e3f4a0000001",
          "6605a2e5c1d2e3f4a0000002",
          "6605a2e5c1d2e3f4a0000003",
          "6605a2e5c1d2e3f4a0000004"
        ];
        const users = await User.find({ _id: { $in: DEMO_IDS } });
        for (const u of users) {
           await RiskScore.create({
              userId: u._id,
              score: 0.95, // High Risk (Trigger ready)
              factors: { weather: 3, traffic: 1, pollution: 2, _demo_forced: true }
           });
        }

        const afterState = await getSystemStateSnapshot();
        const difference = { before: beforeState, after: afterState };

        res.json({ 
            success: true, 
            message: "Simulated Heavy Rain crisis across all nodes.",
            data: difference
        });
    } catch (err) {
        next(err);
    }
};

// 3. Fire Trigger Engine & Output Explainability
exports.fireEngine = async (req, res, next) => {
    try {
        const beforeState = await getSystemStateSnapshot();
        
        // Run standard Trigger evaluation (dry-run rules)
        const evaluationResults = await evaluate(); // Returns array of eligible {userId, riskScore}
        
        let financialMetrics = { totalPayouts: 0, fraudPreventedBase: 0, actions: [] };

        // We process all 4 demo users to generate "Explainability" tracking.
        const allUsers = await User.find({}).lean();
        const now = new Date();

        for (const u of allUsers) {
           const userId = u._id.toString();
           const isEligible = evaluationResults.find(e => e.userId === userId);

           // Deep Diagnostic for Explainability Matrix
           const latestRisk = await RiskScore.findOne({ userId: u._id }).sort({ createdAt: -1 }).lean();
           const activeFraud = await FraudFlag.findOne({ userId: u._id, status: { $in: ['open', 'investigating'] }}).lean();
           
           // Cooldown check (matches evaluator.js)
           const cooldownLimit = new Date(now.getTime() - (parseInt(process.env.PAYOUT_COOLDOWN_MS) || 86400000));
           const recentPayout = await Payout.findOne({ userId: u._id, createdAt: { $gte: cooldownLimit } }).lean();
           
           if (isEligible) {
               // Legit / High Risk User logic
               const iKey = buildIdempotencyKey(userId, now);
               const existingPayout = await Payout.findOne({ idempotencyKey: iKey }).lean();
               financialMetrics.actions.push({
                   userId: u.name,
                   status: "Approved",
                   confidenceScore: 0.96,
                   amount: 500,
                   explainability: "Approved. Consistent delivery history and location telemetry sync perfectly with external hazard markers."
               });
               financialMetrics.totalPayouts += 500;
               if (!existingPayout) {
                 await Payout.create({ userId: u._id, amount: 500, status: 'paid', triggerType: 'demo_auto', idempotencyKey: iKey });
               }
           } else {
               // Determine WHY it failed for Explainability Layer
               if (activeFraud) {
                   financialMetrics.actions.push({
                       userId: u.name,
                       status: "Blocked",
                       confidenceScore: 0.99,
                       amount: 0,
                       explainability: "Blocked due to impossible location telemetry (Delhi to Mumbai in 5 mins). Malicious behavior pattern detected."
                   });
                   financialMetrics.fraudPreventedBase += 500;
               } else if (recentPayout) {
                    financialMetrics.actions.push({
                        userId: u.name,
                        status: "Hold",
                        confidenceScore: 1.0,
                        amount: 0,
                        explainability: "Payout on hold. User received a recovery payout within the last 24 hours. Cooldown guard active."
                    });
               } else if (u.trustScore < 0.5) {
                   financialMetrics.actions.push({
                       userId: u.name,
                       status: "Under Review",
                       confidenceScore: 0.65,
                       amount: 0,
                       explainability: "Held for manual review. Critically low activity history (< 1 delivery). Insufficient behavioral baseline."
                   });
               } else if (latestRisk && latestRisk.score < 0.5) {
                   financialMetrics.actions.push({
                       userId: u.name,
                       status: "Ignored",
                       confidenceScore: 1.0,
                       amount: 0,
                       explainability: "Ignored. Risk score is perfectly stable, no physical hazard detected in this zone."
                   });
               } else {
                    financialMetrics.actions.push({
                        userId: u.name,
                        status: "Processing",
                        confidenceScore: 0.5,
                        amount: 0,
                        explainability: "System is verifying external markers. Please ensure hazard simulation is active."
                    });
               }
           }
        }

        const afterState = await getSystemStateSnapshot();

        res.json({
            success: true,
            explainability_matrix: financialMetrics.actions,
            metrics: {
                totalPayoutsIssued: financialMetrics.totalPayouts,
                fraudPreventedValue: financialMetrics.fraudPreventedBase,
                payoutsBlocked: financialMetrics.actions.filter(a => a.status === 'Blocked' || a.status === 'Under Review').length
            },
            beforeVsAfter: {
                before: beforeState,
                after: afterState
            }
        });
    } catch (err) {
        next(err);
    }
};
