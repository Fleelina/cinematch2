const { createServer } = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const config = require('./src/config');
const { setupSocketAuth } = require('./src/socket/middleware');
const { setupSocketHandlers } = require('./src/socket/handlers');
const { getPrisma, disconnectPrisma } = require('./src/config/database');

// Database initialization
const prisma = getPrisma();

// HTTP + Socket.io server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e6,
});

// Socket.io setup
setupSocketAuth(io);
setupSocketHandlers(io);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutdown başlatılıyor...');
  httpServer.close();
  await disconnectPrisma();
  process.exit(0);
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 Server ${config.port} portunda başladı (${config.nodeEnv})`);
});
