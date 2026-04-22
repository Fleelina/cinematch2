const prisma = require('../prisma');
const { sendPushNotification } = require('./notification.service');
const { ApiError } = require('../middleware/errorHandler');

const upsertInteraction = (fromUserId, toUserId, type, db = prisma) =>
  db.interaction.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    update: { type },
    create: { fromUserId, toUserId, type },
  });

const findMutualLike = (fromUserId, toUserId) =>
  prisma.interaction.findFirst({
    where: { fromUserId: toUserId, toUserId: fromUserId, type: 'LIKE' },
  });

const normalizeMatchIds = (id1, id2) =>
  id1 < id2 ? { user1Id: id1, user2Id: id2 } : { user1Id: id2, user2Id: id1 };

const findMatch = (fromUserId, toUserId) => {
  const { user1Id, user2Id } = normalizeMatchIds(fromUserId, toUserId);
  return prisma.match.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });
};

const findMatchByIdForUser = (matchId, userId, db = prisma) =>
  db.match.findFirst({
    where: {
      id: matchId,
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
  });

const upsertMatch = (fromUserId, toUserId, db = prisma) => {
  const { user1Id, user2Id } = normalizeMatchIds(fromUserId, toUserId);
  return db.match.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    update: {},
    create: { user1Id, user2Id },
  });
};

const getCommonMovies = async (userId1, userId2, limit, db = prisma) => {
  const commonMovies = await db.userMovie.findMany({
    where: {
      userId: userId1,
      movie: {
        users: {
          some: { userId: userId2 },
        },
      },
    },
    select: {
      movie: {
        select: {
          id: true,
          title: true,
          poster: true,
          tmdbId: true,
          year: true,
        },
      },
    },
    orderBy: {
      movie: { title: 'asc' },
    },
    ...(limit ? { take: limit } : {}),
  });

  return commonMovies.map((entry) => entry.movie);
};

const getRandomCommonMovie = async (userId1, userId2, db = prisma) => {
  const commonMovies = await getCommonMovies(userId1, userId2, undefined, db);
  if (commonMovies.length === 0) return null;
  return commonMovies[Math.floor(Math.random() * commonMovies.length)];
};

const createCommonMovieMessage = async (match, userId1, userId2, db = prisma) => {
  const commonMovie = await getRandomCommonMovie(userId1, userId2, db);
  if (!commonMovie) return;

  await db.message.create({
    data: {
      matchId: match.id,
      senderId: null,
      type: 'SYSTEM',
      text: `\uD83C\uDFAC Ortak filminiz: ${commonMovie.title}. Bu film hakk\u0131nda ne d\u00FC\u015F\u00FCn\u00FCyorsun?`,
    },
  });
};

const getUsersForNotification = (id1, id2) =>
  Promise.all([
    prisma.user.findUnique({ where: { id: id1 }, select: { name: true, pushToken: true } }),
    prisma.user.findUnique({ where: { id: id2 }, select: { name: true, pushToken: true } }),
  ]);

const getBlockedUserIdsForUser = async (userId) => {
  const blockedInteractions = await prisma.interaction.findMany({
    where: {
      type: 'BLOCK',
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    select: { fromUserId: true, toUserId: true },
  });

  return new Set(
    blockedInteractions
      .flatMap((interaction) => [interaction.fromUserId, interaction.toUserId])
      .filter((id) => id !== userId)
  );
};

const getMatches = async (userId) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, avatar: true, bio: true } },
      user2: { select: { id: true, name: true, avatar: true, bio: true } },
    },
  });

  return matches.map((match) => ({
    matchId: match.id,
    createdAt: match.createdAt,
    user: match.user1Id === userId ? match.user2 : match.user1,
  }));
};

const sendMatchNotifications = async (fromUserId, toUserId) => {
  try {
    const [fromUser, toUser] = await getUsersForNotification(fromUserId, toUserId);

    if (toUser?.pushToken) {
      sendPushNotification(
        toUser.pushToken,
        'Yeni Eslesme!',
        `${fromUser.name} ile eslestin! Ortak film zevkiniz var.`,
        { screen: 'Mesajlar' }
      );
    }

    if (fromUser?.pushToken) {
      sendPushNotification(
        fromUser.pushToken,
        'Yeni Eslesme!',
        `${toUser.name} ile eslestin! Ortak film zevkiniz var.`,
        { screen: 'Mesajlar' }
      );
    }
  } catch (err) {
    console.error('Push notification hatasi:', err);
  }
};

const likeUser = async (fromUserId, toUserId) => {
  await upsertInteraction(fromUserId, toUserId, 'LIKE');

  const mutual = await findMutualLike(fromUserId, toUserId);
  if (!mutual) return { matched: false };

  let createdNewMatch = false;

  try {
    createdNewMatch = await prisma.$transaction(async (tx) => {
      const { user1Id, user2Id } = normalizeMatchIds(fromUserId, toUserId);
      const existingMatch = await tx.match.findUnique({
        where: { user1Id_user2Id: { user1Id, user2Id } },
      });

      if (existingMatch) {
        await upsertInteraction(fromUserId, toUserId, 'MATCHED', tx);
        await upsertInteraction(toUserId, fromUserId, 'MATCHED', tx);
        return false;
      }

      const match = await tx.match.create({
        data: { user1Id, user2Id },
      });
      await upsertInteraction(fromUserId, toUserId, 'MATCHED', tx);
      await upsertInteraction(toUserId, fromUserId, 'MATCHED', tx);
      await createCommonMovieMessage(match, fromUserId, toUserId, tx);
      return true;
    });
  } catch (error) {
    if (error.code !== 'P2002') {
      throw error;
    }
  }

  if (createdNewMatch) {
    setImmediate(() => sendMatchNotifications(fromUserId, toUserId));
  }

  return { matched: true };
};

const dislikeUser = (fromUserId, toUserId) =>
  upsertInteraction(fromUserId, toUserId, 'DISLIKE');

const blockUser = async (userId, targetUserId) => {
  const existingMatch = await findMatch(userId, targetUserId);

  await prisma.$transaction(async (tx) => {
    if (existingMatch) {
      await tx.match.delete({ where: { id: existingMatch.id } });
    }

    await upsertInteraction(userId, targetUserId, 'BLOCK', tx);
  });

  return { success: true };
};

const endMatch = async (userId, matchId) => {
  const match = await findMatchByIdForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Eslesme bulunamadi');

  const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

  await prisma.$transaction(async (tx) => {
    await tx.match.delete({ where: { id: matchId } });
    await upsertInteraction(userId, otherUserId, 'DISLIKE', tx);
    await upsertInteraction(otherUserId, userId, 'LIKE', tx);
  });

  return { success: true };
};

const blockMatch = async (userId, matchId) => {
  const match = await findMatchByIdForUser(matchId, userId);
  if (!match) throw new ApiError(404, 'Eslesme bulunamadi');

  const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
  return blockUser(userId, otherUserId);
};

const unblockUser = async (userId, targetUserId) => {
  await prisma.interaction.deleteMany({
    where: {
      fromUserId: userId,
      toUserId: targetUserId,
      type: 'BLOCK',
    },
  });

  return { success: true };
};

const getLikedMe = async (userId) => {
  const interactions = await prisma.interaction.findMany({
    where: { toUserId: userId, type: 'LIKE' },
    select: {
      fromUserId: true,
      createdAt: true,
      fromUser: { select: { id: true, name: true, avatar: true, avatarType: true, bio: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const matchedUserIds = new Set(
    (await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true },
    }))
      .flatMap((match) => [match.user1Id, match.user2Id])
      .filter((id) => id !== userId)
  );

  const blockedUserIds = await getBlockedUserIdsForUser(userId);

  return interactions
    .filter((interaction) => !matchedUserIds.has(interaction.fromUserId))
    .filter((interaction) => !blockedUserIds.has(interaction.fromUserId))
    .map((interaction) => ({ ...interaction.fromUser, likedAt: interaction.createdAt }));
};

const getILiked = async (userId) => {
  const interactions = await prisma.interaction.findMany({
    where: { fromUserId: userId, type: 'LIKE' },
    select: {
      toUserId: true,
      createdAt: true,
      toUser: { select: { id: true, name: true, avatar: true, avatarType: true, bio: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const matchedUserIds = new Set(
    (await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true },
    }))
      .flatMap((match) => [match.user1Id, match.user2Id])
      .filter((id) => id !== userId)
  );

  const blockedUserIds = await getBlockedUserIdsForUser(userId);

  return interactions
    .filter((interaction) => !matchedUserIds.has(interaction.toUserId))
    .filter((interaction) => !blockedUserIds.has(interaction.toUserId))
    .map((interaction) => ({ ...interaction.toUser, likedAt: interaction.createdAt }));
};

module.exports = {
  likeUser,
  dislikeUser,
  blockUser,
  getMatches,
  getLikedMe,
  getILiked,
  upsertInteraction,
  findMutualLike,
  findMatch,
  findMatchByIdForUser,
  upsertMatch,
  getCommonMovies,
  getRandomCommonMovie,
  normalizeMatchIds,
  getUsersForNotification,
  endMatch,
  blockMatch,
  unblockUser,
};
