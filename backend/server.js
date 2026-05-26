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
  cors: {
    origin(origin, callback) {
      if (config.nodeEnv !== 'production') return callback(null, true);
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Socket origin reddedildi'));
    },
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6,
});

// Socket.io setup
setupSocketAuth(io);
setupSocketHandlers(io);

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} alindi, shutdown baslatiliyor...`);
  httpServer.close();
  await disconnectPrisma();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 Server ${config.port} portunda başladı (${config.nodeEnv})`);
});
