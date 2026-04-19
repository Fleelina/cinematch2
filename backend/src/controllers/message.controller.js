const prisma = require('../prisma');
const { sendPushNotification } = require('../services/notification.service');

// Kullanıcının tüm match konuşmalarını son mesajla birlikte getir
const getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
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
      const unread = 0; // ileride eklenebilir
      return {
        matchId: m.id,
        matchedAt: m.createdAt,
        user: other,
        lastMessage: lastMsg
          ? { text: lastMsg.text, createdAt: lastMsg.createdAt, mine: lastMsg.senderId === userId }
          : null,
      };
    });

    // Son mesaja göre sırala (mesajı olanlar üste)
    result.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchedAt);
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchedAt);
      return bTime - aTime;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Konuşmalar alınamadı' });
  }
};

// Belirli bir match'in mesajlarını getir
const getMessages = async (req, res) => {
  const userId = req.user.userId;
  const { matchId } = req.params;

  try {
    // Match'in bu kullanıcıya ait olduğunu doğrula
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, name: true, avatar: true, avatarType: true } },
        user2: { select: { id: true, name: true, avatar: true, avatarType: true } },
      },
    });

    if (!match) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        senderId: true,
        createdAt: true,
        readAt: true,
      },
    });

    const other = match.user1Id === userId ? match.user2 : match.user1;

    res.json({ messages, other });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
};

// Mesaj gönder
const sendMessage = async (req, res) => {
  const userId = req.user.userId;
  const { matchId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Mesaj boş olamaz' });
  }

  try {
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (!match) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    const message = await prisma.message.create({
      data: { matchId, senderId: userId, text: text.trim() },
    });

    // Karşı tarafın push token'ını al ve bildirim gönder
    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { pushToken: true, name: true },
    });
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (otherUser?.pushToken) {
      sendPushNotification(
        otherUser.pushToken,
        sender.name,
        text.trim(),
        { screen: 'Chat', matchId }
      );
    }

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
};

module.exports = { getConversations, getMessages, sendMessage };
