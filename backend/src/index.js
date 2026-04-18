const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const movieRoutes = require('./routes/movie.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');
const personRoutes = require('./routes/person.routes');
const messageRoutes = require('./routes/message.routes');

const prisma = require('./prisma');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// JWT doğrulama
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Token bulunamadi'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Gecersiz token'));
  }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);

  // Kullanicinin tum match odalarına otomatik katıl
  prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    select: { id: true },
  }).then((matches) => {
    matches.forEach((m) => socket.join(`match:${m.id}`));
  }).catch(console.error);

  // Manuel oda katılımı (belirli bir chat açıldığında)
  socket.on('join_room', ({ matchId }) => {
    socket.join(`match:${matchId}`);
  });

  // Mesaj gönderme
  socket.on('send_message', async ({ matchId, text }) => {
    if (!text || !text.trim()) return;

    try {
      const match = await prisma.match.findFirst({
        where: { id: matchId, OR: [{ user1Id: userId }, { user2Id: userId }] },
      });
      if (!match) return;

      const message = await prisma.message.create({
        data: { matchId, senderId: userId, text: text.trim() },
      });

      // Odadaki herkese gönder
      io.to(`match:${matchId}`).emit('new_message', message);
    } catch (err) {
      console.error('Mesaj gonderilemedi:', err);
      socket.emit('message_error', { error: 'Mesaj gonderilemedi' });
    }
  });

  // Yazıyor bildirimi
  socket.on('typing', ({ matchId }) => {
    socket.to(`match:${matchId}`).emit('user_typing', { userId });
  });

  socket.on('stop_typing', ({ matchId }) => {
    socket.to(`match:${matchId}`).emit('user_stop_typing', { userId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
  });
});

app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'CineMatch API çalışıyor 🎬' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
