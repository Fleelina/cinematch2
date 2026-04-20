const axios = require('axios');
const cache = require('./cache');
const { translate } = require('@vitalets/google-translate-api/dist/cjs/index.js');

const TMDB_BASE = 'https://api.themoviedb.org/3';

const searchMovies = async (query) => {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `search:${normalizedQuery}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await axios.get(`${TMDB_BASE}/search/movie`, {
    params: { api_key: process.env.TMDB_API_KEY, query, language: 'en-US' },
  });

  const movies = response.data.results.map((movie) => ({
    tmdbId: movie.id,
    title: movie.original_title || movie.title,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null,
    year: movie.release_date?.slice(0, 4),
  }));

  cache.set(cacheKey, movies, 300);
  return movies;
};

const getCachedResults = async (cacheKey, url, extraParams = {}, ttl = 600) => {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await axios.get(url, {
    params: { api_key: process.env.TMDB_API_KEY, language: 'en-US', ...extraParams },
  });

  const results = response.data.results || [];
  cache.set(cacheKey, results, ttl);
  return results;
};

const getMovieDetail = async (tmdbId) => {
  const cacheKey = `movie_detail:${tmdbId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [detailRes, creditsRes] = await Promise.all([
    axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
      params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
    }),
    axios.get(`${TMDB_BASE}/movie/${tmdbId}/credits`, {
      params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
    }),
  ]);

  const movie = detailRes.data;
  const credits = creditsRes.data;
  const director = credits.crew.find((person) => person.job === 'Director');

  const data = {
    tmdbId: movie.id,
    title: movie.original_title || movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null,
    year: movie.release_date?.slice(0, 4),
    runtime: movie.runtime,
    genres: movie.genres.map((genre) => genre.name),
    rating: movie.vote_average?.toFixed(1),
    director: director ? director.name : null,
    directorId: director ? director.id : null,
    cast: credits.cast.slice(0, 10).map((person) => ({
      personId: person.id,
      name: person.name,
      character: person.character,
      photo: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
    })),
  };

  cache.set(cacheKey, data, 1800);
  return data;
};

const getSuggestionPools = async ({ popularPage, nowPlayingPage, topRatedPage, classicsPage }) =>
  Promise.all([
    getCachedResults(`popular:${popularPage}`, `${TMDB_BASE}/movie/popular`, { page: popularPage }, 600),
    getCachedResults(`now_playing:${nowPlayingPage}`, `${TMDB_BASE}/movie/now_playing`, { page: nowPlayingPage }, 600),
    getCachedResults(`top_rated:${topRatedPage}`, `${TMDB_BASE}/movie/top_rated`, { page: topRatedPage }, 1800),
    getCachedResults(
      `classics:${classicsPage}`,
      `${TMDB_BASE}/discover/movie`,
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

const getSimilarMovies = (tmdbId, page) =>
  getCachedResults(`similar:${tmdbId}:${page}`, `${TMDB_BASE}/movie/${tmdbId}/similar`, { page }, 900);

const translateText = async (text) => {
  const cacheKey = `translate:${text.slice(0, 50)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = await translate(text, { to: 'tr' });
  cache.set(cacheKey, result.text, 3600);
  return result.text;
};

const getPersonDetail = async (personId) => {
  const cacheKey = `person_detail:${personId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [trDetailRes, enDetailRes, creditsRes] = await Promise.all([
    axios.get(`${TMDB_BASE}/person/${personId}`, {
      params: { api_key: process.env.TMDB_API_KEY, language: 'tr-TR' },
    }),
    axios.get(`${TMDB_BASE}/person/${personId}`, {
      params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
    }),
    axios.get(`${TMDB_BASE}/person/${personId}/combined_credits`, {
      params: { api_key: process.env.TMDB_API_KEY, language: 'tr-TR' },
    }),
  ]);

  const p = trDetailRes.data;
  const pEn = enDetailRes.data;
  const credits = creditsRes.data;

  const trBio = p.biography?.trim() || '';
  const enBio = pEn.biography?.trim() || '';
  const biography = trBio.length > 100 ? trBio : enBio;

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

const searchPeople = async (query) => {
  const cacheKey = `characters:${query.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = await axios.get(`${TMDB_BASE}/search/person`, {
    params: { api_key: process.env.TMDB_API_KEY, query, language: 'tr-TR' },
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

module.exports = {
  searchMovies,
  getMovieDetail,
  getPersonDetail,
  getSuggestionPools,
  getSimilarMovies,
  translateText,
  searchPeople,
};
