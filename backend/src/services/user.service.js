const prisma = require('../prisma');
const { ApiError } = require('../middleware/errorHandler');
const { deleteFromR2 } = require('./upload.service');

const DISLIKE_COOLDOWN_HOURS = 24;

// Profil ekraninin ihtiyac duydugu kullanici + film iliskilerini yukler.
const getProfile = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: { movies: { include: { movie: true } } },
  });

// Username benzersizligini, mevcut kullaniciyi haric tutarak kontrol eder.
const isUsernameTaken = (username, excludeUserId) =>
  prisma.user.findFirst({
    where: { username, NOT: { id: excludeUserId } },
  });

// Hafif username uygunluk kontrolu; sadece var/yok bilgisi doner.
const isUsernameAvailable = async (username) => {
  const existing = await prisma.user.findFirst({ where: { username } });
  return !existing;
};

// User update islemleri icin ince bir Prisma wrapper'i.
const updateUser = (userId, data) =>
  prisma.user.update({ where: { id: userId }, data });

// Push token son gorulen degerle overwrite edilir.
const savePushToken = (userId, token) =>
  prisma.user.update({ where: { id: userId }, data: { pushToken: token } });

// Hassas alanlari response modelinden temizler.
const stripPassword = ({ password, ...user }) => user;

// Discover akisi icin aday kullanicilari uretir.
// Daha once begenilenler ve cooldown icindeki dislike'lar dislanir.
const discoverUsers = async (userId) => {
  const cooldownDate = new Date(Date.now() - DISLIKE_COOLDOWN_HOURS * 60 * 60 * 1000);

  const [likes, recentDislikes, blockedUsers, myMovies] = await Promise.all([
    prisma.interaction.findMany({ where: { fromUserId: userId, type: { in: ['LIKE', 'MATCHED'] } }, select: { toUserId: true } }),
    prisma.interaction.findMany({ where: { fromUserId: userId, type: 'DISLIKE', createdAt: { gte: cooldownDate } }, select: { toUserId: true } }),
    prisma.interaction.findMany({ where: { fromUserId: userId, type: 'BLOCK' }, select: { toUserId: true } }),
    prisma.userMovie.findMany({ where: { userId }, select: { movieId: true } }),
  ]);

  const excludedIds = [
    ...new Set([
      userId,
      ...likes.map((i) => i.toUserId),
      ...recentDislikes.map((i) => i.toUserId),
      ...blockedUsers.map((i) => i.toUserId),
    ]),
  ];
  const myMovieIds = myMovies.map((m) => m.movieId);
  const myMovieIdSet = new Set(myMovieIds);

  const others = await prisma.user.findMany({
    where: { id: { notIn: excludedIds } },
    select: {
      id: true, name: true, username: true, bio: true,
      avatar: true, avatarType: true, profilePhotos: true, age: true, showAge: true,
      movies: {
        select: { movieId: true, movie: { select: { id: true, title: true, poster: true, tmdbId: true } } },
        take: 20,
      },
    },
  });

  return others
    .map((user) => {
      const theirMovieIds = user.movies.map((m) => m.movieId);
      const commonCount = theirMovieIds.filter((id) => myMovieIdSet.has(id)).length;
      const score = myMovieIds.length > 0 ? (commonCount / myMovieIds.length) * 100 : 0;
      if (!user.showAge) user.age = null;
      return { ...user, matchScore: Math.round(score), commonMovies: commonCount };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
};

// Profilde gosterilecek izleme stilini film sayisindan turetir.
const computeWatchStyle = (count) => {
  if (count >= 50) return { label: 'Sinefil', emoji: '\uD83C\uDFA9' };
  if (count >= 20) return { label: 'Binge Watcher', emoji: '\uD83C\uDF7F' };
  if (count >= 10) return { label: 'Film Sever', emoji: '\uD83C\uDFAC' };
  if (count >= 1) return { label: 'Başlangıç', emoji: '\uD83C\uDF31' };
  return null;
};

// Kullanicinin en yogun film donemini decade bazinda hesaplar.
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

// Kullanicinin kendi profil istatistiklerini toplar.
// Sorgular paralel calisir, turetilmis alanlar servis katmaninda hesaplanir.
const getProfileStats = async (userId) => {
  const [movieCount, matchCount, ratings, topMovies, allMovies] = await Promise.all([
    prisma.userMovie.count({ where: { userId } }),
    prisma.match.count({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
    prisma.movieRating.findMany({ where: { userId }, select: { rating: true } }),
    prisma.userMovie.findMany({
      where: { userId },
      select: { movie: { select: { title: true, poster: true, tmdbId: true, year: true } } },
      orderBy: { movie: { id: 'desc' } },
      take: 4,
    }),
    prisma.userMovie.findMany({
      where: { userId },
      select: {
        movie: {
          select: { year: true, runtime: true, genres: true, director: true, cast: true },
        },
      },
    }),
  ]);

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  // Tür dağılımı
  const genreCounts = {};
  for (const { movie } of allMovies) {
    if (!movie.genres) continue;
    try {
      const parsed = JSON.parse(movie.genres);
      for (const g of parsed) genreCounts[g] = (genreCounts[g] || 0) + 1;
    } catch {}
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  // Toplam dakika ve gün
  const totalMinutes = allMovies.reduce((sum, { movie }) => sum + (movie.runtime || 0), 0);
  const totalDays = totalMinutes > 0 ? (totalMinutes / 1440).toFixed(1) : null;

  // En fazla filmi izlenen yönetmen
  const directorCounts = {};
  for (const { movie } of allMovies) {
    if (!movie.director) continue;
    directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
  }
  const topDirector = Object.entries(directorCounts).sort((a, b) => b[1] - a[1])[0] || null;

  // En fazla filmi izlenen oyuncu
  const actorCounts = {};
  for (const { movie } of allMovies) {
    if (!movie.cast) continue;
    try {
      const parsed = JSON.parse(movie.cast);
      for (const actor of parsed) actorCounts[actor] = (actorCounts[actor] || 0) + 1;
    } catch {}
  }
  const topActor = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    movieCount,
    matchCount,
    avgRating,
    favoriteEra: computeFavoriteEra(allMovies),
    topMovies: topMovies.map((um) => um.movie),
    watchStyle: computeWatchStyle(movieCount),
    topGenres,
    totalMinutes,
    totalDays: totalDays ? parseFloat(totalDays) : null,
    topDirector: topDirector ? { name: topDirector[0], count: topDirector[1] } : null,
    topActor: topActor ? { name: topActor[0], count: topActor[1] } : null,
  };
};

const getBlockedUsers = async (userId) => {
  const blocked = await prisma.interaction.findMany({
    where: { fromUserId: userId, type: 'BLOCK' },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      toUser: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          avatarType: true,
          profilePhotos: true,
          bio: true,
          age: true,
          showAge: true,
        },
      },
    },
  });

  return blocked.map(({ createdAt, toUser }) => ({
    ...toUser,
    age: toUser?.showAge ? toUser.age : null,
    blockedAt: createdAt,
  }));
};

// Public profil icin minimum alan setini doner.
// `showAge` kapaliysa yas response'tan maskelenir.
const getPublicProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, bio: true, avatar: true, avatarType: true, profilePhotos: true, age: true, showAge: true, createdAt: true },
  });
  if (!user) return null;
  if (!user.showAge) user.age = null;
  return user;
};

// Public profil istatistikleri, private profil ile ayni kurallarla uretilir.
const getPublicStats = async (userId) => {
  const [movieCount, matchCount, ratings, topMovies, allMovies, movieRatings, userMovies] = await Promise.all([
    prisma.userMovie.count({ where: { userId } }),
    prisma.match.count({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
    prisma.movieRating.findMany({ where: { userId }, select: { rating: true } }),
    prisma.userMovie.findMany({
      where: { userId },
      select: { movie: { select: { title: true, poster: true, tmdbId: true, year: true } } },
      orderBy: { movie: { id: 'desc' } },
      take: 4,
    }),
    prisma.userMovie.findMany({
      where: { userId },
      select: {
        movie: {
          select: { year: true, runtime: true, genres: true, director: true, cast: true },
        },
      },
    }),
    prisma.movieRating.findMany({
      where: { userId },
      select: {
        movieId: true,
        rating: true,
        updatedAt: true,
      },
    }),
    prisma.userMovie.findMany({
      where: { userId },
      orderBy: { movie: { id: 'desc' } },
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
    }),
  ]);

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  const genreCounts = {};
  for (const { movie } of allMovies) {
    if (!movie.genres) continue;
    try {
      const parsed = JSON.parse(movie.genres);
      for (const g of parsed) genreCounts[g] = (genreCounts[g] || 0) + 1;
    } catch {}
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  const totalMinutes = allMovies.reduce((sum, { movie }) => sum + (movie.runtime || 0), 0);
  const totalDays = totalMinutes > 0 ? (totalMinutes / 1440).toFixed(1) : null;

  const directorCounts = {};
  for (const { movie } of allMovies) {
    if (!movie.director) continue;
    directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
  }
  const topDirector = Object.entries(directorCounts).sort((a, b) => b[1] - a[1])[0] || null;

  const actorCounts = {};
  for (const { movie } of allMovies) {
    if (!movie.cast) continue;
    try {
      const parsed = JSON.parse(movie.cast);
      for (const actor of parsed) actorCounts[actor] = (actorCounts[actor] || 0) + 1;
    } catch {}
  }
  const topActor = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0] || null;
  const ratingsByMovieId = new Map(
    movieRatings.map((entry) => [
      entry.movieId,
      { rating: entry.rating, ratedAt: entry.updatedAt },
    ])
  );

  return {
    movieCount,
    matchCount,
    avgRating,
    favoriteEra: computeFavoriteEra(allMovies),
    topMovies: topMovies.map((um) => um.movie),
    movies: userMovies.map(({ movie }) => ({
      ...movie,
      rating: ratingsByMovieId.get(movie.id)?.rating ?? null,
      ratedAt: ratingsByMovieId.get(movie.id)?.ratedAt ?? null,
    })),
    watchStyle: computeWatchStyle(movieCount),
    topGenres,
    totalMinutes,
    totalDays: totalDays ? parseFloat(totalDays) : null,
    topDirector: topDirector ? { name: topDirector[0], count: topDirector[1] } : null,
    topActor: topActor ? { name: topActor[0], count: topActor[1] } : null,
  };
};

// Authenticated kullanicinin tam profilini getirir.
const fetchProfile = async (userId) => {
  const user = await getProfile(userId);
  if (!user) throw new ApiError(404, 'Kullanici bulunamadi');
  return stripPassword(user);
};

// Profil guncellemesini parcali update mantigiyla yapar.
// Yeni upload avatar geldiyse eski R2 objesi async olarak temizlenir.
const updateProfile = async (userId, { name, username, bio, avatar, avatarType, profilePhotos, age, showAge, gender }) => {
  if (username) {
    const taken = await isUsernameTaken(username, userId);
    if (taken) throw new ApiError(409, 'Bu kullanici adi zaten alinmis');
  }

  // Yeni avatar geliyorsa eski upload dosyasi best-effort olarak silinir.
  // Eski avatar yeni foto listesinde duruyorsa silinmez; siralama degisince 2./3. foto kirilmasin.
  if (avatar) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true, avatarType: true } });
    const nextProfilePhotos = Array.isArray(profilePhotos) ? profilePhotos.slice(0, 3).filter(Boolean) : [];
    const oldAvatarStillUsed = nextProfilePhotos.includes(current?.avatar);
    if (current?.avatar && current.avatar !== avatar && !oldAvatarStillUsed && (current.avatarType === 'upload' || current.avatarType === 'photo')) {
      setImmediate(() => deleteFromR2(current.avatar).catch((err) => console.error('[R2] Avatar silinemedi:', current.avatar, err)));
    }
  }

  const updated = await updateUser(userId, {
    ...(name !== undefined && { name }),
    ...(username !== undefined && { username }),
    ...(bio !== undefined && { bio }),
    ...(avatar !== undefined && { avatar }),
    ...(avatarType !== undefined && { avatarType }),
    ...(profilePhotos !== undefined && { profilePhotos: profilePhotos.slice(0, 3).filter(Boolean) }),
    ...(age !== undefined && { age: age ? parseInt(age, 10) : null }),
    ...(showAge !== undefined && { showAge }),
    ...(gender !== undefined && { gender: gender ?? null }),
  });

  return stripPassword(updated);
};

// Public profil endpoint'i icin 404 davranisini merkezilesir.
const fetchPublicProfile = async (userId) => {
  const user = await getPublicProfile(userId);
  if (!user) throw new ApiError(404, 'Kullanici bulunamadi');
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
  getBlockedUsers,
  getPublicProfile,
  getPublicStats,
};
