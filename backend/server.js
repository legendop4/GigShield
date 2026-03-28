const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { PORT } = require('./config/env');
const socketService = require('./services/socketService');

const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  // Create HTTP server wrapping Express
  const server = http.createServer(app);

  // Initialize WebSockets
  socketService.init(server);

  // Start HTTP server instead of Express
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT} (REST + WebSockets)`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
