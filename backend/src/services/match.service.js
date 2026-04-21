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

// (A,B) ve (B,A) aynı unique key'e map'lensin diye küçük olan önce
const normalizeMatchIds = (id1, id2) =>
  id1 < id2 ? { user1Id: id1, user2Id: id2 } : { user1Id: id2, user2Id: id1 };

const upsertMatch = (fromUserId, toUserId) => {
  const { user1Id, user2Id } = normalizeMatchIds(fromUserId, toUserId);
  return prisma.match.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    update: {},
    create: { user1Id, user2Id },
  });
};

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

const sendMatchNotifications = async (fromUserId, toUserId) => {
  try {
    const [fromUser, toUser] = await getUsersForNotification(fromUserId, toUserId);
    if (toUser?.pushToken) {
      sendPushNotification(toUser.pushToken, '❤️ Yeni Eşleşme!',
        `${fromUser.name} ile eşleştin! Ortak film zevkiniz var.`, { screen: 'Mesajlar' });
    }
    if (fromUser?.pushToken) {
      sendPushNotification(fromUser.pushToken, '❤️ Yeni Eşleşme!',
        `${toUser.name} ile eşleştin! Ortak film zevkiniz var.`, { screen: 'Mesajlar' });
    }
  } catch (err) {
    console.error('Push notification hatası:', err);
  }
};

const likeUser = async (fromUserId, toUserId) => {
  await upsertInteraction(fromUserId, toUserId, 'LIKE');

  const mutual = await findMutualLike(fromUserId, toUserId);
  if (!mutual) return { matched: false };

  // mutual doğrulandı — idempotent upsert, ikinci check-then-act döngüsü yok
  // UNIQUE constraint normalize edilmiş (A,B) key'i üzerinden DB garantisi veriyor
  await upsertMatch(fromUserId, toUserId);

  setImmediate(() => sendMatchNotifications(fromUserId, toUserId));

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
  upsertMatch,
  normalizeMatchIds,
  getUsersForNotification,
};
