const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

let io;

module.exports = {
  /**
   * Initialize Socket.IO with the Express HTTP server
   */
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
      },
    });

    // Authentication Middleware for Sockets
    io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id; // Attach userId to the socket
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`🔌 Client connected via WebSocket [User ID: ${socket.userId}]`);
      
       // Join a private room unique to the user
      socket.join(socket.userId);

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected [User ID: ${socket.userId}]`);
      });
    });

    return io;
  },

  /**
   * Get the globally initialized io instance
   */
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
};
