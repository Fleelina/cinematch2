const express = require('express');
const cors = require('cors');
const Sentry = require('@sentry/node');
const helmet = require('helmet');

const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const { globalApiLimiter } = require('./middleware/rateLimiters');

// Sentry — uygulama baslamadan once init edilmeli
Sentry.init({
  dsn: config.sentryDsn,
  enabled: !!config.sentryDsn,
  environment: config.nodeEnv,
  tracesSampleRate: 0.2,
});

// Routes
const authRoutes = require('./routes/auth.routes');
const movieRoutes = require('./routes/movie.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');
const personRoutes = require('./routes/person.routes');
const messageRoutes = require('./routes/message.routes');
const uploadRoutes = require('./routes/upload.routes');
const importRoutes = require('./routes/import.routes');
const gameRoutes = require('./routes/game.routes');

const app = express();

app.set('trust proxy', config.trustProxy);

const corsOptions = {
  origin(origin, callback) {
    if (config.nodeEnv !== 'production') return callback(null, true);
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin reddedildi'));
  },
};

const { publicAvatarUploadLimiter } = require('./middleware/rateLimiters');

// Middleware
app.use(helmet());
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use('/api', globalApiLimiter);
// Upload rate limit — body parse'tan ÖNCE çalışmalı; büyük istekler parse edilmeden reddedilir.
app.use('/api/upload/avatar/public', publicAvatarUploadLimiter);
// Genel JSON limiti — DoS koruması icin dusuk tutulur.
// Upload endpoint'i kendi 10mb limitini ayri olarak tanimlar.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/upload')) {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    express.json({ limit: '100kb' })(req, res, next);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/import', importRoutes);
app.use('/api/games', gameRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'CineMatch API çalışıyor 🎬', env: config.nodeEnv });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
