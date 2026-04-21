const { getPrisma } = require('../config/database');
const messageService = require('../services/message.service');

function setupSocketHandlers(io) {
  const prisma = getPrisma();

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected`);

    // Match odalarına otomatik katıl
    loadUserRooms(userId, socket);

    // Event handlers
    socket.on('join_room', (data) => handleJoinRoom(data, socket));
    socket.on('send_message', (data) => handleSendMessage(data, socket, io));
    socket.on('typing', (data) => handleTyping(data, socket));
    socket.on('stop_typing', (data) => handleStopTyping(data, socket));
    socket.on('disconnect', () => handleDisconnect(userId));
  });
}

async function loadUserRooms(userId, socket) {
  const prisma = getPrisma();
  try {
    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });
    matches.forEach((m) => socket.join(`match:${m.id}`));
  } catch (err) {
    console.error('Oda yükleme hatası:', err);
  }
}

function handleJoinRoom({ matchId }, socket) {
  socket.join(`match:${matchId}`);
}

async function handleSendMessage({ matchId, text }, socket, io) {
  if (!text || !text.trim()) return;

  try {
    const message = await messageService.sendMessage(matchId, socket.userId, text.trim());
    io.to(`match:${matchId}`).emit('new_message', message);
  } catch (err) {
    console.error('Mesaj hatası:', err);
    socket.emit('message_error', { error: 'Mesaj gönderilemedi' });
  }
}

function handleTyping({ matchId }, socket) {
  socket.to(`match:${matchId}`).emit('user_typing', { userId: socket.userId });
}

function handleStopTyping({ matchId }, socket) {
  socket.to(`match:${matchId}`).emit('user_stop_typing', { userId: socket.userId });
}

function handleDisconnect(userId) {
  console.log(`User ${userId} disconnected`);
}

module.exports = { setupSocketHandlers };
