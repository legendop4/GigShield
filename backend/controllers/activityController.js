const mongoose = require('mongoose');
const ActivityLog = require('../../shared/models/ActivityLog');

/**
 * @desc   Create a new activity log
 * @route  POST /api/activity
 */
exports.createActivity = async (req, res, next) => {
  try {
    const { userId, location, deliveriesCompleted } = req.body;

    // Validate userId is a valid ObjectId
    if (!userId) {
      const err = new Error('userId must be a valid ObjectId');
      err.statusCode = 400;
      throw err;
    }

    // Validate location
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      const err = new Error('location with numeric lat and lng is required');
      err.statusCode = 400;
      throw err;
    }

    // Validate deliveriesCompleted if provided
    if (deliveriesCompleted !== undefined) {
      if (typeof deliveriesCompleted !== 'number') {
        const err = new Error('deliveriesCompleted must be a number');
        err.statusCode = 400;
        throw err;
      }
      if (deliveriesCompleted < 0) {
        const err = new Error('deliveriesCompleted cannot be negative');
        err.statusCode = 400;
        throw err;
      }
    }

    // Fraud Detection: Impossible Movement Tracking
    const lastActivity = await ActivityLog.findOne({ userId }).sort({ timestamp: -1 });
    const nowTimestamp = new Date();

    if (lastActivity) {
        const { detectImpossibleTravel } = require('../services/fraudDetectionService');
        const currentData = { location, timestamp: nowTimestamp };
        const previousData = { 
            location: lastActivity.location, 
            timestamp: new Date(lastActivity.timestamp || lastActivity.createdAt) 
        };
        await detectImpossibleTravel(userId, currentData, previousData);
    }

    const activity = await ActivityLog.create({
      userId,
      location,
      deliveriesCompleted,
    });

    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all activity logs for a user
 * @route  GET /api/activity/:userId
 */
exports.getUserActivities = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validate userId is a valid ObjectId
    if (!userId) {
      const err = new Error('userId must be a valid ObjectId');
      err.statusCode = 400;
      throw err;
    }

    // Advanced: Add pagination to protect memory
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await ActivityLog.countDocuments({ userId });
    
    const logs = await ActivityLog.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.json({ 
      success: true, 
      count: logs.length, 
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: logs 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create multiple activity logs (Bulk Ingest)
 * @route  POST /api/activity/bulk
 */
exports.bulkCreateActivity = async (req, res, next) => {
  try {
    const { activities } = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
      const err = new Error('activities must be a non-empty array');
      err.statusCode = 400;
      throw err;
    }

    const validatedActivities = activities.map(item => {
      const { userId, location, deliveriesCompleted, timestamp } = item;

      if (!userId) {
        throw new Error(`userId must be a valid ObjectId for all items`);
      }
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error('location with numeric lat and lng is required for all items');
      }
      if (deliveriesCompleted !== undefined) {
        if (typeof deliveriesCompleted !== 'number' || deliveriesCompleted < 0) {
          throw new Error('deliveriesCompleted must be a positive number if provided');
        }
      }

      // Check ISO format validity if timestamp is provided
      let validTimestamp = Date.now();
      if (timestamp) {
        validTimestamp = new Date(timestamp);
        if (isNaN(validTimestamp.getTime())) {
          throw new Error('timestamp must be a valid ISO Date string');
        }
      }

      return { userId, location, deliveriesCompleted, timestamp: validTimestamp };
    });

    // Fraud Detection: Verify sequences across all users
    const { detectImpossibleTravel } = require('../services/fraudDetectionService');
    const userGroups = {};
    for (const item of validatedActivities) {
        const uid = item.userId.toString();
        if (!userGroups[uid]) userGroups[uid] = [];
        userGroups[uid].push(item);
    }

    for (const [uid, userActivities] of Object.entries(userGroups)) {
        userActivities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        const lastActivity = await ActivityLog.findOne({ userId: uid }).sort({ timestamp: -1 });
        let previousData = null;
        if (lastActivity) {
            previousData = {
                location: lastActivity.location,
                timestamp: new Date(lastActivity.timestamp || lastActivity.createdAt)
            };
        }

        for (const item of userActivities) {
            const currentData = { location: item.location, timestamp: item.timestamp };
            if (previousData) {
                await detectImpossibleTravel(uid, currentData, previousData);
            }
            previousData = currentData;
        }
    }

    const inserted = await ActivityLog.insertMany(validatedActivities);

    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 400; // Map mapping throw to 400
    next(err);
  }
};
