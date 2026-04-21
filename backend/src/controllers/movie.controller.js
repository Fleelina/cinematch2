const movieService = require('../services/movie.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const searchMovies = asyncHandler(async (req, res) => {
  const { query } = req.validated.query;
  const movies = await movieService.searchMovies(query);
  ok(res, movies);
});

const getMovieDetail = asyncHandler(async (req, res) => {
  const { tmdbId } = req.validated.params;
  const data = await movieService.getMovieDetailWithUserData(tmdbId, req.user.userId);
  ok(res, data);
});

const getMovieSuggestions = asyncHandler(async (req, res) => {
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
  await movieService.removeFromProfile(req.user.userId, movieId);
  ok(res, null);
});

const removeMovieByTmdbId = asyncHandler(async (req, res) => {
  const { tmdbId } = req.validated.params;
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
  const translated = await movieService.translateText(text);
  ok(res, { translated });
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
};

