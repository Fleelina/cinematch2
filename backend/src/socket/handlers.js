const { getPrisma } = require('../config/database');
const messageService = require('../services/message.service');

// Kullanicinin verilen match'e uye olup olmadigini dogrular.
async function assertMatchMember(userId, matchId) {
  const prisma = getPrisma();
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    select: { id: true },
  });
  if (!match) throw new Error(`Yetkisiz erisim: user=${userId} match=${matchId}`);
}

// Socket baglantisi acildiginda tum event binding'lerini merkezilesir.
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected`);

    loadUserRooms(userId, socket);

    socket.on('join_room', (data) => handleJoinRoom(data, socket));
    socket.on('send_message', (data) => handleSendMessage(data, socket, io));
    socket.on('typing', (data) => handleTyping(data, socket));
    socket.on('stop_typing', (data) => handleStopTyping(data, socket));
    socket.on('disconnect', () => handleDisconnect(userId));
  });
}

// Kullanici baglandiginda ait oldugu tum match odalarina otomatik dahil edilir.
async function loadUserRooms(userId, socket) {
  const prisma = getPrisma();

  try {
    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });

    matches.forEach((match) => socket.join(`match:${match.id}`));
  } catch (err) {
    console.error('Oda yukleme hatasi:', err);
  }
}

// Istek uzerine tekil match odasina manuel katilim — uyelik dogrulanir.
async function handleJoinRoom({ matchId }, socket) {
  try {
    await assertMatchMember(socket.userId, matchId);
    socket.join(`match:${matchId}`);
  } catch (err) {
    console.warn('join_room reddedildi:', err.message);
    socket.emit('room_error', { error: 'Bu odaya katilma yetkiniz yok' });
  }
}

// Mesaji service katmaninda olusturur ve ilgili room'a broadcast eder.
async function handleSendMessage({ matchId, text, movieId }, socket, io) {
  if (!text || !text.trim()) return;

  try {
    const message = await messageService.sendMessage(matchId, socket.userId, text.trim(), movieId || null);
    io.to(`match:${matchId}`).emit('new_message', message);
  } catch (err) {
    console.error('Mesaj hatasi:', err);
    socket.emit('message_error', { error: 'Mesaj gonderilemedi' });
  }
}

// Typing eventi — uyelik dogrulanir, sadece diger oda uyelerine iletilir.
async function handleTyping({ matchId }, socket) {
  try {
    await assertMatchMember(socket.userId, matchId);
    socket.to(`match:${matchId}`).emit('user_typing', { userId: socket.userId });
  } catch (err) {
    console.warn('typing reddedildi:', err.message);
  }
}

// Typing durumunun bittigi bilgisi — uyelik dogrulanir, sadece diger uyelere gider.
async function handleStopTyping({ matchId }, socket) {
  try {
    await assertMatchMember(socket.userId, matchId);
    socket.to(`match:${matchId}`).emit('user_stop_typing', { userId: socket.userId });
  } catch (err) {
    console.warn('stop_typing reddedildi:', err.message);
  }
}

// Disconnect su an sadece log seviyesinde izlenir.
function handleDisconnect(userId) {
  console.log(`User ${userId} disconnected`);
}

module.exports = { setupSocketHandlers };
