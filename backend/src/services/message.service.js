const prisma = require('../prisma');
const { ApiError } = require('../middleware/errorHandler');
const { sendPushNotification } = require('./notification.service');

const USER_SELECT = { id: true, name: true, avatar: true, avatarType: true, pushToken: true };

const getConversations = async (userId) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: USER_SELECT },
      user2: { select: USER_SELECT },
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
      user1: { select: USER_SELECT },
      user2: { select: USER_SELECT },
    },
  });

const getMessages = (matchId) =>
  prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, text: true, senderId: true, createdAt: true, readAt: true },
  });

const createMessage = (matchId, senderId, text) =>
  prisma.message.create({ data: { matchId, senderId, text } });

const fetchMessages = async (matchId, userId) => {
  const match = await findMatchForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Konuşma bulunamadı');

  const messages = await getMessages(matchId);
  const other = match.user1Id === userId ? match.user2 : match.user1;
  return { messages, other };
};

const sendMessage = async (matchId, userId, text) => {
  const match = await findMatchForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Konuşma bulunamadı');

  const message = await createMessage(matchId, userId, text);

  const sender = match.user1Id === userId ? match.user1 : match.user2;
  const other  = match.user1Id === userId ? match.user2 : match.user1;

  setImmediate(() => {
    if (other?.pushToken) {
      sendPushNotification(other.pushToken, sender.name, text, { screen: 'Chat', matchId });
    }
  });

  return message;
};

module.exports = {
  getConversations,
  fetchMessages,
  sendMessage,
  findMatchForUser,
  getMessages,
  createMessage,
};
