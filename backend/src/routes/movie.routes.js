const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/search', authMiddleware, movieController.searchMovies);
router.get('/suggestions', authMiddleware, movieController.getMovieSuggestions);
router.get('/detail/:tmdbId', authMiddleware, movieController.getMovieDetail);
router.post('/add', authMiddleware, movieController.addMovieToProfile);
router.post('/rate/:tmdbId', authMiddleware, movieController.rateMovie);
router.get('/watchlist', authMiddleware, movieController.getWatchlist);
router.post('/watchlist', authMiddleware, movieController.addToWatchlist);
router.delete('/watchlist/:tmdbId', authMiddleware, movieController.removeFromWatchlist);
router.post('/translate', authMiddleware, movieController.translateText);
router.delete('/remove/:tmdbId', authMiddleware, movieController.removeMovieByTmdbId);
router.delete('/:movieId', authMiddleware, movieController.removeMovieFromProfile);
router.get('/my', authMiddleware, movieController.getMyMovies);

module.exports = router;
