const matchService = require('../services/match.service');
const { sendPushNotification } = require('../services/notification.service');

const likeUser = async (req, res) => {
  const fromUserId = req.user.userId;
  const { targetUserId: toUserId } = req.params;

  try {
    await matchService.upsertInteraction(fromUserId, toUserId, 'LIKE');

    const mutual = await matchService.findMutualLike(fromUserId, toUserId);
    if (!mutual) return res.json({ matched: false, message: 'Like gönderildi' });

    const existing = await matchService.findExistingMatch(fromUserId, toUserId);
    if (!existing) {
      await matchService.createMatch(fromUserId, toUserId);

      const [fromUser, toUser] = await matchService.getUsersForNotification(fromUserId, toUserId);

      if (toUser?.pushToken) {
        sendPushNotification(toUser.pushToken, '❤️ Yeni Eşleşme!',
          `${fromUser.name} ile eşleştin! Ortak film zevkiniz var.`, { screen: 'Mesajlar' });
      }
      if (fromUser?.pushToken) {
        sendPushNotification(fromUser.pushToken, '❤️ Yeni Eşleşme!',
          `${toUser.name} ile eşleştin! Ortak film zevkiniz var.`, { screen: 'Mesajlar' });
      }
    }

    res.json({ matched: true, message: 'Eşleştiniz! 🎉' });
  } catch (err) {
    console.error('[likeUser]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const dislikeUser = async (req, res) => {
  const fromUserId = req.user.userId;
  const { targetUserId: toUserId } = req.params;

  try {
    await matchService.upsertInteraction(fromUserId, toUserId, 'DISLIKE');
    res.json({ message: 'Dislike kaydedildi' });
  } catch (err) {
    console.error('[dislikeUser]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const getMatches = async (req, res) => {
  try {
    const matches = await matchService.getMatches(req.user.userId);
    res.json(matches);
  } catch (err) {
    console.error('[getMatches]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { likeUser, dislikeUser, getMatches };
