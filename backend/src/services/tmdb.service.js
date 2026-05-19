const axios = require('axios');
const cache = require('../utils/cache');
const { translate } = require('@vitalets/google-translate-api/dist/cjs/index.js');

// TMDB icin ortak axios client.
// Varsayilan dil arama ve listeleme cevaplarini tutarli hale getirir.
const tmdbClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
  params: { language: 'en-US' },
  timeout: 10000,
});

// Film aramasini normalize edilmis query bazli cache'ler.
// Donus modeli uygulamanin tukettigi minimum alana indirgenir.
const searchMovies = async (query) => {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `search:${normalizedQuery}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await tmdbClient.get('/search/movie', {
    params: { query },
  });

  const movies = response.data.results
    .map((movie) => ({
      tmdbId: movie.id,
      title: movie.title || movie.original_title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null,
      year: movie.release_date?.slice(0, 4),
      rating: movie.vote_average ? parseFloat(movie.vote_average.toFixed(1)) : null,
      voteCount: movie.vote_count ?? 0,
    }))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  cache.set(cacheKey, movies, 300);
  return movies;
};

// Ag kaynakli gecici hatalarda kontrollu retry uygular.
// 4xx hatalar tekrar edilmez.
const withRetry = async (fn, retries = 2, delay = 500) => {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries + 1;
      const isRetryable = !err.response || err.response.status >= 500 || err.code === 'ECONNABORTED';
      if (isLast || !isRetryable) throw err;
      console.warn(`[TMDB] Retry ${attempt}/${retries} — ${err.message}`);
      await new Promise((res) => setTimeout(res, delay * attempt));
    }
  }
};

// Liste endpoint'leri icin ortak cache + retry yardimcisi.
// Ham `results` dizisini saklar, sekillendirme cagiranda kalir.
const getCachedResults = async (cacheKey, url, extraParams = {}, ttl = 600) => {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await withRetry(() => tmdbClient.get(url, { params: { ...extraParams } }));

  const results = response.data.results || [];
  cache.set(cacheKey, results, ttl);
  return results;
};

// Film detayini ve cast/crew bilgisini tek servis cevabinda birlestirir.
// Detay ekraninin ihtiyac duydugu alanlari burada normalize eder.
const getMovieDetail = async (tmdbId) => {
  const cacheKey = `movie_detail:${tmdbId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [detailRes, creditsRes] = await withRetry(() =>
    Promise.all([
      tmdbClient.get(`/movie/${tmdbId}`),
      tmdbClient.get(`/movie/${tmdbId}/credits`),
    ])
  );

  const movie = detailRes.data;
  const credits = creditsRes.data;
  const director = credits.crew.find((person) => person.job === 'Director');

  const data = {
    tmdbId: movie.id,
    title: movie.title || movie.original_title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null,
    year: movie.release_date?.slice(0, 4),
    runtime: movie.runtime ?? null,
    genres: movie.genres?.map((genre) => genre.name) ?? [],
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
    director: director?.name ?? null,
    directorId: director?.id ?? null,
    cast: credits.cast?.slice(0, 10).map((person) => ({
      personId: person.id,
      name: person.name,
      character: person.character,
      photo: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
    })) ?? [],
  };

  cache.set(cacheKey, data, 1800);
  return data;
};

// Oneri akisi icin kullanilan temel TMDB havuzlarini paralel toplar.
const getSuggestionPools = async ({ popularPage, nowPlayingPage, topRatedPage, classicsPage }) =>
  Promise.all([
    getCachedResults(`popular:${popularPage}`, '/movie/popular', { page: popularPage }, 600),
    getCachedResults(`now_playing:${nowPlayingPage}`, '/movie/now_playing', { page: nowPlayingPage }, 600),
    getCachedResults(`top_rated:${topRatedPage}`, '/movie/top_rated', { page: topRatedPage }, 1800),
    getCachedResults(
      `classics:${classicsPage}`,
      '/discover/movie',
      {
        sort_by: 'vote_average.desc',
        'primary_release_date.gte': '1970-01-01',
        'primary_release_date.lte': '2000-12-31',
        'vote_count.gte': 1000,
        page: classicsPage,
      },
      1800
    ),
  ]);

// Benzer filmler havuzunu film ve sayfa bazli cache'ler.
const getSimilarMovies = (tmdbId, page) =>
  getCachedResults(`similar:${tmdbId}:${page}`, `/movie/${tmdbId}/similar`, { page }, 900);

// Metni Turkceye cevirir; hata durumunda akisi kesmeyip orijinal metni doner.
const translateText = async (text) => {
  const cacheKey = `translate:${text.slice(0, 50)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await translate(text, { to: 'tr' });
    cache.set(cacheKey, result.text, 3600);
    return result.text;
  } catch (err) {
    console.warn('[translate] hata, orijinal metin dönüyor:', err.message);
    return text;
  }
};

// Kisi detayini TR biyografi oncelikli olacak sekilde derler.
// Turkce biyografi yetersizse EN fallback kullanilir.
const getPersonDetail = async (personId) => {
  const cacheKey = `person_detail:${personId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [trDetailRes, creditsRes] = await withRetry(() =>
    Promise.all([
      tmdbClient.get(`/person/${personId}`, { params: { language: 'tr-TR' } }),
      tmdbClient.get(`/person/${personId}/combined_credits`),
    ])
  );

  const p = trDetailRes.data;
  const credits = creditsRes.data;

  const trBio = p.biography?.trim() || '';
  let biography = trBio;
  if (trBio.length <= 100) {
    const enDetailRes = await tmdbClient.get(`/person/${personId}`);
    biography = enDetailRes.data.biography?.trim() || trBio;
  }

  const actedIn = credits.cast
    ? credits.cast
        .filter((c) => c.media_type === 'movie' && c.poster_path)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20)
        .map((c) => ({
          tmdbId: c.id,
          title: c.title,
          character: c.character,
          poster: `https://image.tmdb.org/t/p/w185${c.poster_path}`,
          year: c.release_date?.slice(0, 4) || null,
          rating: c.vote_average ? c.vote_average.toFixed(1) : null,
        }))
    : [];

  const directed = credits.crew
    ? credits.crew
        .filter((c) => c.media_type === 'movie' && c.job === 'Director' && c.poster_path)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20)
        .map((c) => ({
          tmdbId: c.id,
          title: c.title,
          poster: `https://image.tmdb.org/t/p/w185${c.poster_path}`,
          year: c.release_date?.slice(0, 4) || null,
          rating: c.vote_average ? c.vote_average.toFixed(1) : null,
        }))
    : [];

  const data = {
    personId: p.id,
    name: p.name,
    photo: p.profile_path ? `https://image.tmdb.org/t/p/w342${p.profile_path}` : null,
    biography,
    birthday: p.birthday || null,
    placeOfBirth: p.place_of_birth || null,
    knownForDepartment: p.known_for_department || null,
    actedIn,
    directed,
  };

  cache.set(cacheKey, data, 1800);
  return data;
};

// Kisi aramasini hafif bir sonuc modeliyle doner.
// Profil fotosu olmayan kayitlar liste disi birakilir.
const searchPeople = async (query) => {
  const cacheKey = `characters:${query.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = await tmdbClient.get('/search/person', {
    params: { query, language: 'tr-TR' },
  });

  const people = res.data.results
    .filter((p) => p.profile_path)
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      name: p.name,
      photo: `https://image.tmdb.org/t/p/w300${p.profile_path}`,
      knownFor: p.known_for?.map((k) => k.title || k.name).filter(Boolean).slice(0, 2).join(', '),
    }));

  cache.set(cacheKey, people, 600);
  return people;
};

const getTrendingPaged = (page = 1) =>
  getCachedResults(`trending:week:${page}`, '/trending/movie/week', { page }, 3600).then((results) =>
    results.filter((m) => m.poster_path).map((m) => ({
      tmdbId: m.id,
      title: m.title || m.original_title,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      year: m.release_date?.slice(0, 4) || null,
      rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    }))
  );

const getTopRatedPaged = (page = 1) =>
  getCachedResults(`top_rated:${page}`, '/movie/top_rated', { page }, 3600).then((results) =>
    results.filter((m) => m.poster_path).map((m) => ({
      tmdbId: m.id,
      title: m.title || m.original_title,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      year: m.release_date?.slice(0, 4) || null,
      rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    }))
  );

const getClassicsPaged = (page = 1) =>
  getCachedResults(
    `classics:${page}`,
    '/discover/movie',
    {
      sort_by: 'vote_average.desc',
      'primary_release_date.gte': '1970-01-01',
      'primary_release_date.lte': '2000-12-31',
      'vote_count.gte': 1000,
      page,
    },
    7200
  ).then((results) =>
    results.filter((m) => m.poster_path).map((m) => ({
      tmdbId: m.id,
      title: m.title || m.original_title,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      year: m.release_date?.slice(0, 4) || null,
      rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    }))
  );

const getPublicPopular = (page = 1) =>
  getCachedResults(`popular:${page}`, '/movie/popular', { page, language: 'tr-TR' }, 600).then((results) =>
    results.filter((m) => m.poster_path).map((m) => ({
      tmdbId: m.id,
      title: m.title || m.original_title,
      poster_path: m.poster_path,
      release_date: m.release_date || null,
      id: m.id,
    }))
  );

// Mood bazli film listesi — TMDB genre + keyword kombinasyonuyla beslenir.
// Her mood sabit bir genre seti ve minimum oy sayisiyla filtrelenir.
const MOOD_PARAMS = {
  dark: { with_genres: '53,27,80', sort_by: 'vote_average.desc', 'vote_count.gte': 500 },
  emotional: { with_genres: '18,10749', sort_by: 'popularity.desc', 'vote_count.gte': 500 },
  mind_bending: { with_genres: '878,9648,53', sort_by: 'vote_average.desc', 'vote_count.gte': 300 },
  feel_good: { with_genres: '35,10751,12', sort_by: 'popularity.desc', 'vote_count.gte': 300 },
  thrilling: { with_genres: '28,53,12', sort_by: 'popularity.desc', 'vote_count.gte': 500 },
};

const getMoodMovies = async (mood, page = 1) => {
  const params = MOOD_PARAMS[mood];
  if (!params) throw new Error(`Unknown mood: ${mood}`);
  const cacheKey = `mood:${mood}:${page}`;
  return getCachedResults(cacheKey, '/discover/movie', { ...params, page }, 1800).then((results) =>
    results.filter((m) => m.poster_path).map((m) => ({
      tmdbId: m.id,
      title: m.title || m.original_title,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      year: m.release_date?.slice(0, 4) || null,
      rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    }))
  );
};

module.exports = {
  searchMovies,
  getMovieDetail,
  getPersonDetail,
  getSuggestionPools,
  getSimilarMovies,
  translateText,
  searchPeople,
  getTrendingPaged,
  getTopRatedPaged,
  getClassicsPaged,
  getPublicPopular,
  getMoodMovies,
};
