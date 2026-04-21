const prisma = require('../prisma');
const cache = require('../utils/cache');
const tmdbService = require('./tmdb.service');
const { ApiError } = require('../middleware/errorHandler');

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const getSuggestions = async (userId) => {
  const [userMovies, watchlist] = await Promise.all([
    prisma.userMovie.findMany({ where: { userId }, include: { movie: true } }),
    prisma.watchlist.findMany({ where: { userId }, select: { tmdbId: true } }),
  ]);

  const excludedIds = new Set([
    ...userMovies.map((userMovie) => userMovie.movie.tmdbId),
    ...watchlist.map((item) => item.tmdbId),
  ]);

  const popularPage = Math.floor(Math.random() * 8) + 1;
  const nowPlayingPage = Math.floor(Math.random() * 4) + 1;
  const topRatedPage = Math.floor(Math.random() * 6) + 1;
  const classicsPage = Math.floor(Math.random() * 15) + 1;

  const [popularOne, popularTwo, topRated, classics] = await tmdbService.getSuggestionPools({
    popularPage,
    nowPlayingPage,
    topRatedPage,
    classicsPage,
  });

  let similarMovies = [];
  if (userMovies.length > 0) {
    const sample = shuffle(userMovies).slice(0, 3);
    const similarSets = await Promise.all(
      sample.map((userMovie) =>
        tmdbService.getSimilarMovies(userMovie.movie.tmdbId, nowPlayingPage).catch(() => [])
      )
    );

    const seenSimilar = new Set();
    for (const results of similarSets) {
      for (const movie of results) {
        if (!seenSimilar.has(movie.id) && !excludedIds.has(movie.id) && movie.poster_path) {
          seenSimilar.add(movie.id);
          similarMovies.push(movie);
        }
      }
    }
  }

  const seen = new Set(similarMovies.map((movie) => movie.id));
  const popularMovies = [];
  const topRatedMovies = [];
  const classicMovies = [];

  for (const movie of [...popularOne, ...popularTwo]) {
    if (!seen.has(movie.id) && !excludedIds.has(movie.id) && movie.poster_path) {
      seen.add(movie.id);
      popularMovies.push(movie);
    }
  }

  for (const movie of topRated) {
    if (!seen.has(movie.id) && !excludedIds.has(movie.id) && movie.poster_path) {
      seen.add(movie.id);
      topRatedMovies.push(movie);
    }
  }

  for (const movie of classics) {
    if (!seen.has(movie.id) && !excludedIds.has(movie.id) && movie.poster_path) {
      seen.add(movie.id);
      classicMovies.push(movie);
    }
  }

  const combined = [
    ...shuffle(popularMovies).slice(0, 14),
    ...shuffle(similarMovies).slice(0, 12),
    ...shuffle(topRatedMovies).slice(0, 8),
    ...shuffle(classicMovies).slice(0, 6),
  ];

  const nullPosters = combined.filter(m => !m.poster_path).map(m => ({ id: m.id, title: m.title }));
  if (nullPosters.length > 0) console.log('[POSTER NULL]', nullPosters);

  return shuffle(combined).map((movie) => ({
    tmdbId: movie.id,
    title: movie.original_title || movie.title,
    overview: movie.overview,
    poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null,
    year: movie.release_date?.slice(0, 4) || null,
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
  }));
};

const getMovieDetailWithUserData = async (tmdbId, userId) => {
  const tmdbIdInt = parseInt(tmdbId, 10);
  const tmdbData = await tmdbService.getMovieDetail(tmdbId);

  const [movieInDb, watchlistItem] = await Promise.all([
    prisma.movie.findUnique({
      where: { tmdbId: tmdbIdInt },
      include: { users: { select: { userId: true } } },
    }),
    prisma.watchlist.findUnique({
      where: { userId_tmdbId: { userId, tmdbId: tmdbIdInt } },
      select: { id: true },
    }),
  ]);

  const addedByCount = movieInDb ? movieInDb.users.length : 0;
  const isAdded = movieInDb ? movieInDb.users.some((userMovie) => userMovie.userId === userId) : false;
  const isInWatchlist = Boolean(watchlistItem);

  let cinematchRating = null;
  let userRating = null;
  let ratingCount = 0;

  if (movieInDb) {
    const statsCacheKey = `movie:stats:${movieInDb.id}`;
    let ratingStats = cache.get(statsCacheKey);

    if (!ratingStats) {
      ratingStats = await prisma.movieRating.aggregate({
        where: { movieId: movieInDb.id },
        _avg: { rating: true },
        _count: true,
      });
      cache.set(statsCacheKey, ratingStats, 30);
    }

    if (ratingStats._count > 0) {
      ratingCount = ratingStats._count;
      cinematchRating = ratingStats._avg.rating
        ? Math.round(ratingStats._avg.rating * 10) / 10
        : null;
    }

    const userRatingRecord = await prisma.movieRating.findUnique({
      where: { userId_movieId: { userId, movieId: movieInDb.id } },
      select: { rating: true },
    });
    userRating = userRatingRecord ? userRatingRecord.rating : null;
  }

  return {
    ...tmdbData,
    addedByCount,
    isAdded,
    isInWatchlist,
    cinematchRating,
    userRating,
    ratingCount,
  };
};

const rateMovie = async (userId, tmdbId, rating) => {
  const userMovie = await prisma.userMovie.findFirst({
    where: {
      userId,
      movie: { tmdbId: parseInt(tmdbId, 10) },
    },
    select: { movieId: true },
  });

  if (!userMovie) throw new ApiError(404, 'Film önce profiline eklenmelidir');

  const { movieId } = userMovie;

  await prisma.movieRating.upsert({
    where: { userId_movieId: { userId, movieId } },
    update: { rating },
    create: { userId, movieId, rating },
  });

  const cacheKey = `movie:stats:${movieId}`;

  const newStats = await prisma.movieRating.aggregate({
    where: { movieId },
    _avg: { rating: true },
    _count: true,
  });

  cache.set(cacheKey, newStats, 30);

  return {
    cinematchRating: newStats._avg?.rating ? Math.round(newStats._avg.rating * 10) / 10 : null,
    ratingCount: newStats._count,
    userRating: rating,
  };
};

const addToProfile = async (userId, { tmdbId, title, poster, year }) => {
  const tmdbIdInt = parseInt(tmdbId, 10);
  const movie = await prisma.movie.upsert({
    where: { tmdbId: tmdbIdInt },
    update: {},
    create: { tmdbId: tmdbIdInt, title, poster, year: year ? parseInt(year, 10) : null },
  });

  await prisma.userMovie.upsert({
    where: { userId_movieId: { userId, movieId: movie.id } },
    update: {},
    create: { userId, movieId: movie.id },
  });

  const addedByCount = await prisma.userMovie.count({ where: { movieId: movie.id } });
  return { movie, addedByCount };
};

const removeFromProfile = async (userId, movieId) => {
  const deleted = await prisma.userMovie.deleteMany({
    where: { userId, movieId },
  });

  if (deleted.count === 0) throw new ApiError(404, 'Film profilinde bulunamadı');

  return { success: true };
};

const removeFromProfileByTmdbId = async (userId, tmdbId) => {
  const movie = await prisma.movie.findUnique({ where: { tmdbId: parseInt(tmdbId, 10) } });
  if (!movie) throw new ApiError(404, 'Film bulunamadı');

  await prisma.userMovie.deleteMany({
    where: { userId, movieId: movie.id },
  });

  return prisma.userMovie.count({ where: { movieId: movie.id } });
};

const getMyMovies = async (userId) => {
  const userMovies = await prisma.userMovie.findMany({
    where: { userId },
    include: { movie: true },
    orderBy: { movie: { title: 'asc' } },
  });

  return userMovies.map((userMovie) => userMovie.movie);
};

const searchMovies = async (query) => tmdbService.searchMovies(query);

const translateText = async (text) => tmdbService.translateText(text);

const getWatchlist = (userId) =>
  prisma.watchlist.findMany({
    where: { userId },
    orderBy: { addedAt: 'desc' },
  });

const addToWatchlist = (userId, { tmdbId, title, poster, year }) =>
  prisma.watchlist.upsert({
    where: { userId_tmdbId: { userId, tmdbId } },
    update: {},
    create: { userId, tmdbId, title, poster, year: year ? parseInt(year, 10) : null },
  });

const removeFromWatchlist = (userId, tmdbId) =>
  prisma.watchlist.deleteMany({
    where: { userId, tmdbId: parseInt(tmdbId, 10) },
  });

module.exports = {
  searchMovies,
  translateText,
  getSuggestions,
  getMovieDetailWithUserData,
  rateMovie,
  addToProfile,
  removeFromProfile,
  removeFromProfileByTmdbId,
  getMyMovies,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
};
