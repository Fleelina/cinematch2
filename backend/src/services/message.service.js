const prisma = require('../prisma');
const { ApiError } = require('../middleware/errorHandler');
const { sendPushNotification } = require('./notification.service');

const getConversations = async (userId) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, avatar: true, avatarType: true } },
      user2: { select: { id: true, name: true, avatar: true, avatarType: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = matches.map((m) => {
    const other = m.user1Id === userId ? m.user2 : m.user1;
    const lastMsg = m.messages[0] || null;
    return {
      matchId: m.id,
      matchedAt: m.createdAt,
      user: other,
      lastMessage: lastMsg
        ? { text: lastMsg.text, createdAt: lastMsg.createdAt, mine: lastMsg.senderId === userId }
        : null,
    };
  });

  // Son mesaja göre sırala
  return result.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchedAt);
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchedAt);
    return bTime - aTime;
  });
};

const findMatchForUser = (matchId, userId) =>
  prisma.match.findFirst({
    where: { id: matchId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, avatar: true, avatarType: true } },
      user2: { select: { id: true, name: true, avatar: true, avatarType: true } },
    },
  });

const findMatchById = (matchId, userId) =>
  prisma.match.findFirst({
    where: { id: matchId, OR: [{ user1Id: userId }, { user2Id: userId }] },
  });

const getMessages = (matchId) =>
  prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, text: true, senderId: true, createdAt: true, readAt: true },
  });

const createMessage = (matchId, senderId, text) =>
  prisma.message.create({ data: { matchId, senderId, text } });

const getOtherUserWithToken = (match, userId) => {
  const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
  return prisma.user.findUnique({
    where: { id: otherUserId },
    select: { pushToken: true, name: true },
  });
};

const getSenderName = (userId) =>
  prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

const fetchMessages = async (matchId, userId) => {
  const match = await findMatchForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Konuşma bulunamadı');

  const messages = await getMessages(matchId);
  const other = match.user1Id === userId ? match.user2 : match.user1;
  return { messages, other };
};

const sendMessage = async (matchId, userId, text) => {
  const match = await findMatchById(matchId, userId);
  if (!match) throw new ApiError(404, 'Konuşma bulunamadı');

  const message = await createMessage(matchId, userId, text);

  // Bildirim fire & forget
  Promise.all([
    getOtherUserWithToken(match, userId),
    getSenderName(userId),
  ]).then(([otherUser, sender]) => {
    if (otherUser?.pushToken) {
      sendPushNotification(otherUser.pushToken, sender.name, text, { screen: 'Chat', matchId });
    }
  }).catch(() => {});

  return message;
};

module.exports = {
  getConversations,
  fetchMessages,
  sendMessage,
  findMatchForUser,
  findMatchById,
  getMessages,
  createMessage,
  getOtherUserWithToken,
  getSenderName,
};
