const prisma = require('../prisma');
const axios = require('axios');
const cache = require('../services/cache');

const TMDB_BASE = 'https://api.themoviedb.org/3';

const getProfile = async (req, res) => {
  const userId = req.user.userId;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { movies: { include: { movie: true } } },
    });
    if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const { name, username, bio, avatar, avatarType, age, showAge } = req.body;

  try {
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
      });
      if (existing) {
        return res.status(409).json({ error: 'Bu kullanici adi zaten alinmis' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(avatarType !== undefined && { avatarType }),
        ...(age !== undefined && { age: age ? parseInt(age) : null }),
        ...(showAge !== undefined && { showAge }),
      },
    });

    const { password, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const checkUsername = async (req, res) => {
  const { username } = req.query;
  if (!username || username.length < 3) {
    return res.status(400).json({ available: false, error: 'En az 3 karakter olmali' });
  }
  try {
    const existing = await prisma.user.findFirst({ where: { username } });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ available: false });
  }
};

const searchCharacters = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama terimi gerekli' });

  const cacheKey = `characters:${query.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const res2 = await axios.get(`${TMDB_BASE}/search/person`, {
      params: { api_key: process.env.TMDB_API_KEY, query, language: 'tr-TR' },
    });

    const people = res2.data.results
      .filter((p) => p.profile_path)
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        name: p.name,
        photo: `https://image.tmdb.org/t/p/w300${p.profile_path}`,
        knownFor: p.known_for?.map((k) => k.title || k.name).filter(Boolean).slice(0, 2).join(', '),
      }));

    cache.set(cacheKey, people, 600);
    res.json(people);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Arama basarisiz' });
  }
};

const discoverUsers = async (req, res) => {
  const userId = req.user.userId;
  const DISLIKE_COOLDOWN_HOURS = 24;

  try {
    const cooldownDate = new Date(Date.now() - DISLIKE_COOLDOWN_HOURS * 60 * 60 * 1000);
    const [likes, recentDislikes, myMovies] = await Promise.all([
      prisma.interaction.findMany({
        where: { fromUserId: userId, type: 'LIKE' },
        select: { toUserId: true },
      }),
      prisma.interaction.findMany({
        where: { fromUserId: userId, type: 'DISLIKE', createdAt: { gte: cooldownDate } },
        select: { toUserId: true },
      }),
      prisma.userMovie.findMany({
        where: { userId },
        select: { movieId: true },
      }),
    ]);

    const excludedIds = [...new Set([
      userId,
      ...likes.map((i) => i.toUserId),
      ...recentDislikes.map((i) => i.toUserId),
    ])];

    const myMovieIds = myMovies.map((m) => m.movieId);
    const myMovieCount = myMovieIds.length;

    const others = await prisma.user.findMany({
      where: { id: { notIn: excludedIds } },
      select: {
        id: true, name: true, username: true,
        bio: true, avatar: true, avatarType: true,
        age: true, showAge: true,
        movies: {
          select: { movieId: true, movie: { select: { id: true, title: true, poster: true, tmdbId: true } } },
          take: 20,
        },
      },
    });

    const scored = others.map((user) => {
      const theirMovieIds = user.movies.map((m) => m.movieId);
      const commonCount = theirMovieIds.filter((id) => myMovieIds.includes(id)).length;
      const score = myMovieCount > 0 ? (commonCount / myMovieCount) * 100 : 0;
      if (!user.showAge) user.age = null;
      return { ...user, matchScore: Math.round(score), commonMovies: commonCount };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    res.json(scored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const getProfileStats = async (req, res) => {
  const userId = req.user.userId;
  try {
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
      prisma.userMovie.findMany({
        where: { userId },
        select: { movie: { select: { year: true } } },
      }),
    ]);

    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    const eraCounts = {};
    for (const um of movieYears) {
      if (um.movie.year) {
        const decade = Math.floor(um.movie.year / 10) * 10;
        eraCounts[decade] = (eraCounts[decade] || 0) + 1;
      }
    }
    const favoriteEra = Object.keys(eraCounts).length > 0
      ? Object.entries(eraCounts).sort((a, b) => b[1] - a[1])[0][0] + 's'
      : null;

    let watchStyle = null;
    if (movieCount >= 50) watchStyle = { label: 'Sinefil', emoji: '🎩' };
    else if (movieCount >= 20) watchStyle = { label: 'Binge Watcher', emoji: '🍿' };
    else if (movieCount >= 10) watchStyle = { label: 'Film Sever', emoji: '🎬' };
    else if (movieCount >= 1) watchStyle = { label: 'Başlangıç', emoji: '🌱' };

    res.json({
      movieCount, matchCount, avgRating, favoriteEra,
      topMovies: topMovies.map((um) => um.movie),
      watchStyle,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats alinamadi' });
  }
};

const getUserProfile = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, username: true,
        bio: true, avatar: true, avatarType: true,
        age: true, showAge: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    if (!user.showAge) user.age = null;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const getUserStats = async (req, res) => {
  const { userId } = req.params;
  try {
    const [userMovies, matchCount, ratings] = await Promise.all([
      prisma.userMovie.findMany({
        where: { userId },
        select: { movie: { select: { year: true, title: true, poster: true, tmdbId: true } } },
      }),
      prisma.match.count({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
      prisma.movieRating.findMany({ where: { userId }, select: { rating: true } }),
    ]);

    const movieCount = userMovies.length;
    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    const eraCounts = {};
    for (const um of userMovies) {
      if (um.movie.year) {
        const decade = Math.floor(um.movie.year / 10) * 10;
        eraCounts[decade] = (eraCounts[decade] || 0) + 1;
      }
    }
    const favoriteEra = Object.keys(eraCounts).length > 0
      ? Object.entries(eraCounts).sort((a, b) => b[1] - a[1])[0][0] + 's'
      : null;

    const topMovies = userMovies.slice(-4).reverse()
      .map((um) => ({ title: um.movie.title, poster: um.movie.poster, tmdbId: um.movie.tmdbId }));

    let watchStyle = null;
    if (movieCount >= 50) watchStyle = { label: 'Sinefil', emoji: '🎩' };
    else if (movieCount >= 20) watchStyle = { label: 'Binge Watcher', emoji: '🍿' };
    else if (movieCount >= 10) watchStyle = { label: 'Film Sever', emoji: '🎬' };
    else if (movieCount >= 1) watchStyle = { label: 'Başlangıç', emoji: '🌱' };

    res.json({ movieCount, matchCount, avgRating, favoriteEra, topMovies, watchStyle });
  } catch (err) {
    res.status(500).json({ error: 'Stats alınamadı' });
  }
};

module.exports = {
  getProfile, updateProfile, checkUsername, searchCharacters, discoverUsers,
  getProfileStats, getUserProfile, getUserStats,
};
