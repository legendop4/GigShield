const Notification = require('../models/Notification');
const socketService = require('./socketService');

/**
 * Send an in-app notification to a user.
 * Stores the notification in MongoDB and pushes it in real-time via WebSockets if the user is online.
 * 
 * @param {string} userId - Target user's ObjectId
 * @param {string} title - Title of the notification
 * @param {string} message - Body of the notification
 * @param {string} type - 'risk_alert', 'payout', 'fraud_flag', 'system'
 */
const sendNotification = async (userId, title, message, type = 'system') => {
  try {
    // 1. Save to DB
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
    });

    // 2. Emit via WebSocket to user's private room
    const io = socketService.getIO();
    io.to(userId.toString()).emit('new_notification', notification);

    return notification;
  } catch (err) {
    console.error('❌ Failed to send notification:', err);
    throw err;
  }
};

module.exports = { sendNotification };
