const express = require('express');
const cors = require('cors');

const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const movieRoutes = require('./routes/movie.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');
const personRoutes = require('./routes/person.routes');
const messageRoutes = require('./routes/message.routes');
const uploadRoutes = require('./routes/upload.routes');
const importRoutes = require('./routes/import.routes');

const app = express();

// Middleware
app.use(cors());
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
