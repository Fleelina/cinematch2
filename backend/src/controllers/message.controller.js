const messageService = require('../services/message.service');
const { sendPushNotification } = require('../services/notification.service');

const getConversations = async (req, res) => {
  try {
    const conversations = await messageService.getConversations(req.user.userId);
    res.json(conversations);
  } catch (err) {
    console.error('[getConversations]', err);
    res.status(500).json({ error: 'Konuşmalar alınamadı' });
  }
};

const getMessages = async (req, res) => {
  const { userId } = req.user;
  const { matchId } = req.params;

  try {
    const match = await messageService.findMatchForUser(matchId, userId);
    if (!match) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    const messages = await messageService.getMessages(matchId);
    const other = match.user1Id === userId ? match.user2 : match.user1;

    res.json({ messages, other });
  } catch (err) {
    console.error('[getMessages]', err);
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
};

const sendMessage = async (req, res) => {
  const { userId } = req.user;
  const { matchId } = req.params;
  const { text } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: 'Mesaj boş olamaz' });

  try {
    const match = await messageService.findMatchById(matchId, userId);
    if (!match) return res.status(404).json({ error: 'Konuşma bulunamadı' });

    const message = await messageService.createMessage(matchId, userId, text.trim());

    res.json(message);

    // Bildirim arka planda — response'u bekletmez
    Promise.all([
      messageService.getOtherUserWithToken(match, userId),
      messageService.getSenderName(userId),
    ]).then(([otherUser, sender]) => {
      if (otherUser?.pushToken) {
        sendPushNotification(otherUser.pushToken, sender.name, text.trim(), { screen: 'Chat', matchId });
      }
    }).catch(() => {});
  } catch (err) {
    console.error('[sendMessage]', err);
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
};

module.exports = { getConversations, getMessages, sendMessage };
