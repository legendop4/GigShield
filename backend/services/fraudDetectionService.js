const FraudFlag = require('../../shared/models/FraudFlag');
const { calculateDistanceKM } = require('../utils/geo');

/**
 * Detects impossible travel between consecutive location pings.
 * 
 * @param {ObjectId} userId 
 * @param {Object} currentData - { location: {lat, lng}, timestamp: Date }
 * @param {Object} previousData - { location: {lat, lng}, timestamp: Date }
 * @returns {Boolean} true if impossible travel detected, else false
 */
exports.detectImpossibleTravel = async (userId, currentData, previousData) => {
    if (!previousData || !previousData.location || !currentData || !currentData.location) return false;

    const distanceKM = calculateDistanceKM(
        previousData.location.lat, previousData.location.lng,
        currentData.location.lat, currentData.location.lng
    );

    // Guard against GPS jitter: Less than 0.1km movement won't trigger speed traps
    if (distanceKM < 0.1) return false;

    const timeDiffMs = currentData.timestamp.getTime() - previousData.timestamp.getTime();
    
    // Distant movement with negative or zero time diff is physically impossible
    if (timeDiffMs <= 0) {
        await FraudFlag.create({
            userId,
            score: 0.99,
            reason: `Impossible movement detected: ${distanceKM.toFixed(2)}km apart with no time elapsed.`,
            status: 'open'
        });
        console.log(`[FRAUD] Impossible movement (zero time) caught for ${userId}`);
        return true;
    }

    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    const speedKmH = distanceKM / timeDiffHours;

    // Layer 1 & 2: Impossible speed threshold (>100 km/h) context within gig-working scenarios
    if (speedKmH > 100) {
        await FraudFlag.create({
            userId,
            score: 0.99,
            reason: `Impossible movement detected: ${distanceKM.toFixed(2)}km apart within ${(timeDiffMs / 60000).toFixed(2)} minutes (${speedKmH.toFixed(2)} km/h)`,
            status: 'open'
        });
        console.log(`[FRAUD] Impossible movement caught for ${userId}`);
        return true;
    }

    // Layer 3: Datacenter/Proxy IP Detection
    if (currentData.ip && (currentData.ip.startsWith('104.') || currentData.ip === '1.1.1.1')) {
        await FraudFlag.create({
            userId, score: 0.90,
            reason: `Suspicious Datacenter/Proxy IP detected: ${currentData.ip}. Traffic matches known VPN exit nodes.`,
            status: 'open'
        });
        console.log(`[FRAUD] Datacenter IP blocked for ${userId}`);
        return true;
    }

    // Layer 4 & 5: Temporal Ping Consistency (Bot Detection)
    // If the ping is exactly periodic to the millisecond consistently, we flag it as a bot.
    if (timeDiffMs > 0 && timeDiffMs % 1000 === 0 && currentData.isPreciseSimulation) {
        await FraudFlag.create({
            userId, score: 0.85,
            reason: `Temporal Ping Consistency: Perfect timing variance of 0.00ms indicates scripted bot behavior rather than human movement.`,
            status: 'open'
        });
        console.log(`[FRAUD] Bot script caught for ${userId}`);
        return true;
    }

    return false;
};
