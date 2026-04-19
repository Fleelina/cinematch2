const prisma = require('../prisma');
const { sendPushNotification } = require('../services/notification.service');

const likeUser = async (req, res) => {
  const fromUserId = req.user.userId;
  const toUserId = req.params.targetUserId;

  try {
    await prisma.interaction.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: { type: 'LIKE' },
      create: { fromUserId, toUserId, type: 'LIKE' },
    });

    const mutual = await prisma.interaction.findFirst({
      where: { fromUserId: toUserId, toUserId: fromUserId, type: 'LIKE' },
    });

    if (mutual) {
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: fromUserId, user2Id: toUserId },
            { user1Id: toUserId, user2Id: fromUserId },
          ],
        },
      });

      if (!existingMatch) {
        await prisma.match.create({
          data: { user1Id: fromUserId, user2Id: toUserId },
        });

        // Her iki kullanıcıya eşleşme bildirimi gönder
        const [fromUser, toUser] = await Promise.all([
          prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true, pushToken: true } }),
          prisma.user.findUnique({ where: { id: toUserId }, select: { name: true, pushToken: true } }),
        ]);

        if (toUser?.pushToken) {
          sendPushNotification(
            toUser.pushToken,
            '❤️ Yeni Eşleşme!',
            `${fromUser.name} ile eşleştin! Ortak film zevkiniz var.`,
            { screen: 'Mesajlar' }
          );
        }
        if (fromUser?.pushToken) {
          sendPushNotification(
            fromUser.pushToken,
            '❤️ Yeni Eşleşme!',
            `${toUser.name} ile eşleştin! Ortak film zevkiniz var.`,
            { screen: 'Mesajlar' }
          );
        }
      }

      return res.json({ matched: true, message: 'Eşleştiniz! 🎉' });
    }

    res.json({ matched: false, message: 'Like gönderildi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const dislikeUser = async (req, res) => {
  const fromUserId = req.user.userId;
  const toUserId = req.params.targetUserId;

  try {
    await prisma.interaction.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: { type: 'DISLIKE' },
      create: { fromUserId, toUserId, type: 'DISLIKE' },
    });
    res.json({ message: 'Dislike kaydedildi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const getMatches = async (req, res) => {
  const userId = req.user.userId;

  try {
    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true, avatar: true, bio: true } },
        user2: { select: { id: true, name: true, avatar: true, bio: true } },
      },
    });

    const result = matches.map((m) => ({
      matchId: m.id,
      createdAt: m.createdAt,
      user: m.user1Id === userId ? m.user2 : m.user1,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { likeUser, dislikeUser, getMatches };
