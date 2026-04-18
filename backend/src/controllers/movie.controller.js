const axios = require('axios');
const prisma = require('../prisma');

const TMDB_BASE = 'https://api.themoviedb.org/3';

const searchMovies = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama terimi gerekli' });

  try {
    const response = await axios.get(`${TMDB_BASE}/search/movie`, {
      params: { api_key: process.env.TMDB_API_KEY, query, language: 'en-US' },
    });

    const movies = response.data.results.map((m) => ({
      tmdbId: m.id,
      title: m.original_title || m.title,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : null,
      year: m.release_date?.slice(0, 4),
    }));

    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TMDB baglantı hatası' });
  }
};

// Diziyi karistir
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const getMovieSuggestions = async (req, res) => {
  const userId = req.user.userId;
  // Her yenilemede farkli sayfa kombinasyonu
  const randomPage1 = Math.floor(Math.random() * 10) + 1;
  const randomPage2 = Math.floor(Math.random() * 5) + 1;
  const randomPage3 = Math.floor(Math.random() * 8) + 1;

  try {
    const [userMovies, watchlist] = await Promise.all([
      prisma.userMovie.findMany({ where: { userId }, include: { movie: true } }),
      prisma.watchlist.findMany({ where: { userId } }),
    ]);

    const excludedIds = new Set([
      ...userMovies.map((um) => um.movie.tmdbId),
      ...watchlist.map((w) => w.tmdbId),
    ]);

    const seen = new Set();
    const similarMovies = [];
    const popularMovies = [];
    const topRatedMovies = [];
    const classicMovies = [];

    // 1. Benzer filmler (kullanicinin filmlerine gore)
    if (userMovies.length > 0) {
      const sample = shuffle([...userMovies]).slice(0, 4);
      const similarSets = await Promise.all(
        sample.map((um) =>
          axios.get(`${TMDB_BASE}/movie/${um.movie.tmdbId}/similar`, {
            params: { api_key: process.env.TMDB_API_KEY, language: 'en-US', page: randomPage2 },
          }).then((r) => r.data.results).catch(() => [])
        )
      );
      for (const results of similarSets) {
        for (const m of results) {
          if (!seen.has(m.id) && !excludedIds.has(m.id) && m.poster_path) {
            seen.add(m.id);
            similarMovies.push(m);
          }
        }
      }
    }

    // 2. Son donem populer filmler
    const [pop1, pop2] = await Promise.all([
      axios.get(`${TMDB_BASE}/movie/popular`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'en-US', page: randomPage1 },
      }),
      axios.get(`${TMDB_BASE}/movie/now_playing`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'en-US', page: randomPage2 },
      }),
    ]);
    for (const m of [...pop1.data.results, ...pop2.data.results]) {
      if (!seen.has(m.id) && !excludedIds.has(m.id) && m.poster_path) {
        seen.add(m.id);
        popularMovies.push(m);
      }
    }

    // 3. En yuksek puanli filmler
    const topRated = await axios.get(`${TMDB_BASE}/movie/top_rated`, {
      params: { api_key: process.env.TMDB_API_KEY, language: 'en-US', page: randomPage3 },
    });
    for (const m of topRated.data.results) {
      if (!seen.has(m.id) && !excludedIds.has(m.id) && m.poster_path) {
        seen.add(m.id);
        topRatedMovies.push(m);
      }
    }

    // 4. Klasik filmler (1970-2000 arasi, yuksek puan)
    const classics = await axios.get(`${TMDB_BASE}/discover/movie`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        language: 'en-US',
        sort_by: 'vote_average.desc',
        'primary_release_date.gte': '1970-01-01',
        'primary_release_date.lte': '2000-12-31',
        'vote_count.gte': 1000,
        page: randomPage2,
      },
    });
    for (const m of classics.data.results) {
      if (!seen.has(m.id) && !excludedIds.has(m.id) && m.poster_path) {
        seen.add(m.id);
        classicMovies.push(m);
      }
    }

    // Agirlikli karistirma:
    // Populer: %35, Benzer: %30, Top Rated: %20, Klasik: %15
    const combined = [
      ...shuffle(popularMovies).slice(0, 14),   // %35
      ...shuffle(similarMovies).slice(0, 12),    // %30
      ...shuffle(topRatedMovies).slice(0, 8),    // %20
      ...shuffle(classicMovies).slice(0, 6),     // %15
    ];

    // Son karistirma - her yenilemede farkli sira
    const final = shuffle(combined).map((m) => ({
      tmdbId: m.id,
      title: m.original_title || m.title,
      overview: m.overview,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      year: m.release_date?.slice(0, 4) || null,
      rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    }));

    res.json({ movies: final, hasMore: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Oneriler alinamadi' });
  }
};

const getMovieDetail = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.userId;
  const tmdbIdInt = parseInt(tmdbId);

  try {
    // TMDB + DB sorguları tamamen paralel
    const [trDetailRes, enDetailRes, creditsRes, movieInDb, watchlistItem] = await Promise.all([
      axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'tr-TR' },
      }),
      axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
      }),
      axios.get(`${TMDB_BASE}/movie/${tmdbId}/credits`, {
        params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
      }),
      prisma.movie.findUnique({
        where: { tmdbId: tmdbIdInt },
        include: { users: { select: { userId: true } }, ratings: true },
      }),
      prisma.watchlist.findUnique({
        where: { userId_tmdbId: { userId, tmdbId: tmdbIdInt } },
        select: { id: true },
      }),
    ]);

    const m = trDetailRes.data;
    const mEn = enDetailRes.data;
    const credits = creditsRes.data;

    const title = m.original_title || mEn.original_title || mEn.title || m.title;
    const overviewEn = mEn.overview || '';
    const overviewTr = (m.overview && m.overview.trim().length > 20) ? m.overview : '';

    const addedByCount = movieInDb ? movieInDb.users.length : 0;
    const isAdded = movieInDb ? movieInDb.users.some((um) => um.userId === userId) : false;
    const isInWatchlist = !!watchlistItem;

    let cinematchRating = null;
    let userRating = null;
    let ratingCount = 0;

    if (movieInDb && movieInDb.ratings.length > 0) {
      ratingCount = movieInDb.ratings.length;
      const avg = movieInDb.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount;
      cinematchRating = Math.round(avg * 10) / 10;
      const myRating = movieInDb.ratings.find((r) => r.userId === userId);
      userRating = myRating ? myRating.rating : null;
    }

    const directorData = credits.crew.find((c) => c.job === 'Director');
    const cast = credits.cast.slice(0, 10).map((c) => ({
      personId: c.id,
      name: c.name,
      character: c.character,
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }));

    res.json({
      tmdbId: m.id,
      title,
      originalTitle: m.original_title,
      overview: overviewEn,
      overviewTr,
      poster: (mEn.poster_path || m.poster_path) ? `https://image.tmdb.org/t/p/w500${mEn.poster_path || m.poster_path}` : null,
      backdrop: (mEn.backdrop_path || m.backdrop_path) ? `https://image.tmdb.org/t/p/w780${mEn.backdrop_path || m.backdrop_path}` : null,
      year: m.release_date?.slice(0, 4),
      runtime: m.runtime,
      genres: m.genres.map((g) => g.name),
      rating: m.vote_average?.toFixed(1),
      director: directorData ? directorData.name : null,
      directorId: directorData ? directorData.id : null,
      cast,
      addedByCount,
      isAdded,
      isInWatchlist,
      cinematchRating,
      userRating,
      ratingCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Film detayi alinamadi' });
  }
};

const rateMovie = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.userId;
  let { rating } = req.body;

  rating = parseInt(rating);
  if (isNaN(rating) || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Puan 1 ile 10 arasinda olmalidir' });
  }

  try {
    const movie = await prisma.movie.findUnique({ where: { tmdbId: parseInt(tmdbId) } });
    if (!movie) return res.status(404).json({ error: 'Film once profiline eklenmelidir' });

    await prisma.movieRating.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: { rating },
      create: { userId, movieId: movie.id, rating },
    });

    const ratings = await prisma.movieRating.findMany({ where: { movieId: movie.id } });
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const cinematchRating = Math.round(avg * 10) / 10;

    res.json({ message: 'Puan kaydedildi', cinematchRating, ratingCount: ratings.length, userRating: rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const addMovieToProfile = async (req, res) => {
  const { tmdbId, title, poster, year } = req.body;
  const userId = req.user.userId;

  try {
    let movie = await prisma.movie.findUnique({ where: { tmdbId } });
    if (!movie) {
      movie = await prisma.movie.create({
        data: { tmdbId, title, poster, year: year ? parseInt(year) : null },
      });
    }

    await prisma.userMovie.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: {},
      create: { userId, movieId: movie.id },
    });

    const count = await prisma.userMovie.count({ where: { movieId: movie.id } });
    res.json({ message: 'Film profiline eklendi', movie, addedByCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const removeMovieFromProfile = async (req, res) => {
  const { movieId } = req.params;
  const userId = req.user.userId;

  try {
    await prisma.userMovie.delete({ where: { userId_movieId: { userId, movieId } } });
    const count = await prisma.userMovie.count({ where: { movieId } });
    res.json({ message: 'Film profilinden kaldirildi', addedByCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const removeMovieByTmdbId = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.userId;

  try {
    const movie = await prisma.movie.findUnique({ where: { tmdbId: parseInt(tmdbId) } });
    if (!movie) return res.status(404).json({ error: 'Film bulunamadi' });

    await prisma.userMovie.delete({ where: { userId_movieId: { userId, movieId: movie.id } } });
    const count = await prisma.userMovie.count({ where: { movieId: movie.id } });
    res.json({ message: 'Film profilinden kaldirildi', addedByCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

const getWatchlist = async (req, res) => {
  const userId = req.user.userId;
  try {
    const items = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Watchlist alinamadi' });
  }
};

const addToWatchlist = async (req, res) => {
  const userId = req.user.userId;
  const { tmdbId, title, poster, year } = req.body;

  try {
    const item = await prisma.watchlist.upsert({
      where: { userId_tmdbId: { userId, tmdbId } },
      update: {},
      create: { userId, tmdbId, title, poster, year: year ? parseInt(year) : null },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Watchlist eklenemedi' });
  }
};

const removeFromWatchlist = async (req, res) => {
  const userId = req.user.userId;
  const { tmdbId } = req.params;

  try {
    await prisma.watchlist.deleteMany({
      where: { userId, tmdbId: parseInt(tmdbId) },
    });
    res.json({ message: 'Watchlistten kaldirildi' });
  } catch (err) {
    res.status(500).json({ error: 'Watchlistten kaldirilamadi' });
  }
};

const translateText = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Metin gerekli' });
  try {
    const { translate } = require('@vitalets/google-translate-api/dist/cjs/index.js');
    const result = await translate(text, { to: 'tr' });
    res.json({ translated: result.text });
  } catch (err) {
    console.error('Çeviri hatası:', err.message);
    res.status(500).json({ error: 'Çeviri başarısız', translated: text });
  }
};

const getMyMovies = async (req, res) => {
  const userId = req.user.userId;

  try {
    const userMovies = await prisma.userMovie.findMany({
      where: { userId },
      include: { movie: true },
    });
    res.json(userMovies.map((um) => um.movie));
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
};

module.exports = {
  searchMovies, getMovieDetail, rateMovie, getMovieSuggestions,
  addMovieToProfile, removeMovieFromProfile, removeMovieByTmdbId, getMyMovies,
  getWatchlist, addToWatchlist, removeFromWatchlist, translateText,
};
