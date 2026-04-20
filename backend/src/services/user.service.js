const prisma = require('../prisma');
const cache = require('./cache');
const { ApiError } = require('../middleware/errorHandler');
const DISLIKE_COOLDOWN_HOURS = 24;

const getProfile = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: { movies: { include: { movie: true } } },
  });

const isUsernameTaken = (username, excludeUserId) =>
  prisma.user.findFirst({
    where: { username, NOT: { id: excludeUserId } },
  });

const isUsernameAvailable = async (username) => {
  const existing = await prisma.user.findFirst({ where: { username } });
  return !existing;
};

const updateUser = (userId, data) =>
  prisma.user.update({ where: { id: userId }, data });

const savePushToken = (userId, token) =>
  prisma.user.update({ where: { id: userId }, data: { pushToken: token } });

const stripPassword = ({ password, ...user }) => user;

const discoverUsers = async (userId) => {
  const cooldownDate = new Date(Date.now() - DISLIKE_COOLDOWN_HOURS * 60 * 60 * 1000);

  const [likes, recentDislikes, myMovies] = await Promise.all([
    prisma.interaction.findMany({ where: { fromUserId: userId, type: 'LIKE' }, select: { toUserId: true } }),
    prisma.interaction.findMany({ where: { fromUserId: userId, type: 'DISLIKE', createdAt: { gte: cooldownDate } }, select: { toUserId: true } }),
    prisma.userMovie.findMany({ where: { userId }, select: { movieId: true } }),
  ]);

  const excludedIds = [...new Set([userId, ...likes.map((i) => i.toUserId), ...recentDislikes.map((i) => i.toUserId)])];
  const myMovieIds = myMovies.map((m) => m.movieId);

  const others = await prisma.user.findMany({
    where: { id: { notIn: excludedIds } },
    select: {
      id: true, name: true, username: true, bio: true,
      avatar: true, avatarType: true, age: true, showAge: true,
      movies: {
        select: { movieId: true, movie: { select: { id: true, title: true, poster: true, tmdbId: true } } },
        take: 20,
      },
    },
  });

  return others
    .map((user) => {
      const theirMovieIds = user.movies.map((m) => m.movieId);
      const commonCount = theirMovieIds.filter((id) => myMovieIds.includes(id)).length;
      const score = myMovieIds.length > 0 ? (commonCount / myMovieIds.length) * 100 : 0;
      if (!user.showAge) user.age = null;
      return { ...user, matchScore: Math.round(score), commonMovies: commonCount };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
};

const computeWatchStyle = (count) => {
  if (count >= 50) return { label: 'Sinefil', emoji: '🎩' };
  if (count >= 20) return { label: 'Binge Watcher', emoji: '🍿' };
  if (count >= 10) return { label: 'Film Sever', emoji: '🎬' };
  if (count >= 1)  return { label: 'Başlangıç', emoji: '🌱' };
  return null;
};

const computeFavoriteEra = (movieYears) => {
  const eraCounts = {};
  for (const um of movieYears) {
    if (um.movie?.year) {
      const decade = Math.floor(um.movie.year / 10) * 10;
      eraCounts[decade] = (eraCounts[decade] || 0) + 1;
    }
  }
  return Object.keys(eraCounts).length > 0
    ? Object.entries(eraCounts).sort((a, b) => b[1] - a[1])[0][0] + 's'
    : null;
};

const getProfileStats = async (userId) => {
  const [movieCount, matchCount, ratings, topMovies, movieYears] = await Promise.all([
    prisma.userMovie.count({ where: { userId } }),
    prisma.match.count({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
    prisma.movieRating.findMany({ where: { userId }, select: { rating: true } }),
    prisma.userMovie.findMany({
      where: { userId },
      select: { movie: { select: { title: true, poster: true, tmdbId: true, year: true } } },
      orderBy: { movie: { id: 'desc' } },
      take: 4,
    }),
    prisma.userMovie.findMany({ where: { userId }, select: { movie: { select: { year: true } } } }),
  ]);

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  return {
    movieCount,
    matchCount,
    avgRating,
    favoriteEra: computeFavoriteEra(movieYears),
    topMovies: topMovies.map((um) => um.movie),
    watchStyle: computeWatchStyle(movieCount),
  };
};

const getPublicProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, bio: true, avatar: true, avatarType: true, age: true, showAge: true, createdAt: true },
  });
  if (!user) return null;
  if (!user.showAge) user.age = null;
  return user;
};

const getPublicStats = async (userId) => {
  const [userMovies, matchCount, ratings] = await Promise.all([
    prisma.userMovie.findMany({ where: { userId }, select: { movie: { select: { year: true, title: true, poster: true, tmdbId: true } } } }),
    prisma.match.count({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
    prisma.movieRating.findMany({ where: { userId }, select: { rating: true } }),
  ]);

  const movieCount = userMovies.length;
  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  return {
    movieCount,
    matchCount,
    avgRating,
    favoriteEra: computeFavoriteEra(userMovies),
    topMovies: userMovies.slice(-4).reverse().map((um) => um.movie),
    watchStyle: computeWatchStyle(movieCount),
  };
};

const fetchProfile = async (userId) => {
  const user = await getProfile(userId);
  if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı');
  return stripPassword(user);
};

const updateProfile = async (userId, { name, username, bio, avatar, avatarType, age, showAge }) => {
  if (username) {
    const taken = await isUsernameTaken(username, userId);
    if (taken) throw new ApiError(409, 'Bu kullanıcı adı zaten alınmış');
  }

  const updated = await updateUser(userId, {
    ...(name !== undefined && { name }),
    ...(username !== undefined && { username }),
    ...(bio !== undefined && { bio }),
    ...(avatar !== undefined && { avatar }),
    ...(avatarType !== undefined && { avatarType }),
    ...(age !== undefined && { age: age ? parseInt(age) : null }),
    ...(showAge !== undefined && { showAge }),
  });

  return stripPassword(updated);
};

const fetchPublicProfile = async (userId) => {
  const user = await getPublicProfile(userId);
  if (!user) throw new ApiError(404, 'Kullanıcı bulunamadı');
  return user;
};

module.exports = {
  fetchProfile,
  updateProfile,
  fetchPublicProfile,
  getProfile,
  isUsernameTaken,
  isUsernameAvailable,
  updateUser,
  savePushToken,
  stripPassword,
  discoverUsers,
  getProfileStats,
  getPublicProfile,
  getPublicStats,
};
