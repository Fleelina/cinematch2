const movieService = require('../services/movie.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const searchMovies = asyncHandler(async (req, res) => {
  const { query } = req.validated.query;
  // Arama tarafı dış veri kaynağından beslenir; controller burada sadece isteği service'e taşır.
  const movies = await movieService.searchMovies(query);
  ok(res, movies);
});

const getMovieDetail = asyncHandler(async (req, res) => {
  const { tmdbId } = req.validated.params;
  // Film detayı, oturumdaki kullanıcıya ait puan/ekleme bilgileriyle birlikte zenginleştirilir.
  const data = await movieService.getMovieDetailWithUserData(tmdbId, req.user.userId);
  ok(res, data);
});

const getMovieSuggestions = asyncHandler(async (req, res) => {
  // Öneriler kullanıcının profilindeki film tercihleri üzerinden kişiselleştirilir.
  const movies = await movieService.getSuggestions(req.user.userId);
  ok(res, { movies, hasMore: true });
});

const rateMovie = asyncHandler(async (req, res) => {
  const { tmdbId } = req.validated.params;
  const { rating } = req.validated.body;
  const result = await movieService.rateMovie(req.user.userId, tmdbId, rating);
  ok(res, result);
});

const addMovieToProfile = asyncHandler(async (req, res) => {
  const { tmdbId, title, poster, year } = req.validated.body;
  const { movie, addedByCount } = await movieService.addToProfile(req.user.userId, { tmdbId, title, poster, year });
  ok(res, { movie, addedByCount }, 201);
});

const removeMovieFromProfile = asyncHandler(async (req, res) => {
  const { movieId } = req.validated.params;
  // Burada yerel veritabanındaki movie kaydının id'si kullanılır.
  await movieService.removeFromProfile(req.user.userId, movieId);
  ok(res, null);
});

const removeMovieByTmdbId = asyncHandler(async (req, res) => {
  const { tmdbId } = req.validated.params;
  // Bazı akışlarda istemci yerel id yerine TMDB id bildiği için ayrı bir çıkış noktası korunur.
  const addedByCount = await movieService.removeFromProfileByTmdbId(req.user.userId, tmdbId);
  ok(res, { addedByCount });
});

const getMyMovies = asyncHandler(async (req, res) => {
  const movies = await movieService.getMyMovies(req.user.userId);
  ok(res, movies);
});

const getWatchlist = asyncHandler(async (req, res) => {
  const items = await movieService.getWatchlist(req.user.userId);
  ok(res, items);
});

const addToWatchlist = asyncHandler(async (req, res) => {
  const { tmdbId, title, poster, year } = req.validated.body;
  const item = await movieService.addToWatchlist(req.user.userId, { tmdbId, title, poster, year });
  ok(res, item, 201);
});

const removeFromWatchlist = asyncHandler(async (req, res) => {
  const { tmdbId } = req.validated.params;
  await movieService.removeFromWatchlist(req.user.userId, tmdbId);
  ok(res, null);
});

const translateText = asyncHandler(async (req, res) => {
  const { text } = req.validated.body;
  // Çeviri detayı controller'da çözülmez; dış servis ve cache yönetimi service katmanında kalır.
  const translated = await movieService.translateText(text);
  ok(res, { translated });
});

const getTrending = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const movies = await movieService.getTrending(page);
  ok(res, { movies, hasMore: movies.length >= 20 });
});

const getTopRatedCinematch = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const data = await movieService.getTopRatedCinematch(page);
  ok(res, data);
});

const getClassics = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const data = await movieService.getClassics(page);
  ok(res, data);
});

module.exports = {
  searchMovies,
  getMovieDetail,
  getMovieSuggestions,
  rateMovie,
  addMovieToProfile,
  removeMovieFromProfile,
  removeMovieByTmdbId,
  getMyMovies,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  translateText,
  getTrending,
  getTopRatedCinematch,
  getClassics,
};
