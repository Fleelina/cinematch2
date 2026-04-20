const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const movieValidator = require('../validators/movie.validator');

router.get('/search', authMiddleware, validate(movieValidator.searchMovies), movieController.searchMovies);
router.get('/suggestions', authMiddleware, movieController.getMovieSuggestions);
router.get('/my', authMiddleware, movieController.getMyMovies);
router.get('/watchlist', authMiddleware, movieController.getWatchlist);
router.get('/detail/:tmdbId', authMiddleware, validate(movieValidator.tmdbIdParam), movieController.getMovieDetail);
router.post('/add', authMiddleware, validate(movieValidator.addMovie), movieController.addMovieToProfile);
router.post('/rate/:tmdbId', authMiddleware, validate(movieValidator.rateMovie), movieController.rateMovie);
router.post('/watchlist', authMiddleware, validate(movieValidator.addWatchlist), movieController.addToWatchlist);
router.post('/translate', authMiddleware, validate(movieValidator.translateText), movieController.translateText);
router.delete('/watchlist/:tmdbId', authMiddleware, validate(movieValidator.tmdbIdParam), movieController.removeFromWatchlist);
router.delete('/remove/:tmdbId', authMiddleware, validate(movieValidator.tmdbIdParam), movieController.removeMovieByTmdbId);
router.delete('/:movieId', authMiddleware, validate(movieValidator.movieIdParam), movieController.removeMovieFromProfile);

module.exports = router;

