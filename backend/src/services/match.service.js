const prisma = require('../prisma');
const { sendPushNotification } = require('./notification.service');

const upsertInteraction = (fromUserId, toUserId, type) =>
  prisma.interaction.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    update: { type },
    create: { fromUserId, toUserId, type },
  });

const findMutualLike = (fromUserId, toUserId) =>
  prisma.interaction.findFirst({
    where: { fromUserId: toUserId, toUserId: fromUserId, type: 'LIKE' },
  });

const findExistingMatch = (user1Id, user2Id) =>
  prisma.match.findFirst({
    where: {
      OR: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
    },
  });

const createMatch = (user1Id, user2Id) =>
  prisma.match.create({ data: { user1Id, user2Id } });

const getUsersForNotification = (id1, id2) =>
  Promise.all([
    prisma.user.findUnique({ where: { id: id1 }, select: { name: true, pushToken: true } }),
    prisma.user.findUnique({ where: { id: id2 }, select: { name: true, pushToken: true } }),
  ]);

const getMatches = async (userId) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, avatar: true, bio: true } },
      user2: { select: { id: true, name: true, avatar: true, bio: true } },
    },
  });

  return matches.map((m) => ({
    matchId: m.id,
    createdAt: m.createdAt,
    user: m.user1Id === userId ? m.user2 : m.user1,
  }));
};

const likeUser = async (fromUserId, toUserId) => {
  await upsertInteraction(fromUserId, toUserId, 'LIKE');

  const mutual = await findMutualLike(fromUserId, toUserId);
  if (!mutual) return { matched: false };

  const existing = await findExistingMatch(fromUserId, toUserId);
  if (!existing) {
    await createMatch(fromUserId, toUserId);

    const [fromUser, toUser] = await getUsersForNotification(fromUserId, toUserId);

    if (toUser?.pushToken) {
      sendPushNotification(toUser.pushToken, '❤️ Yeni Eşleşme!',
        `${fromUser.name} ile eşleştin! Ortak film zevkiniz var.`, { screen: 'Mesajlar' });
    }
    if (fromUser?.pushToken) {
      sendPushNotification(fromUser.pushToken, '❤️ Yeni Eşleşme!',
        `${toUser.name} ile eşleştin! Ortak film zevkiniz var.`, { screen: 'Mesajlar' });
    }
  }

  return { matched: true };
};

const dislikeUser = (fromUserId, toUserId) =>
  upsertInteraction(fromUserId, toUserId, 'DISLIKE');

module.exports = {
  likeUser,
  dislikeUser,
  getMatches,
  upsertInteraction,
  findMutualLike,
  findExistingMatch,
  createMatch,
  getUsersForNotification,
  getMatches,
};
