const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/modes', authMiddleware, gameController.getGameModes);
router.get('/daily-taste', authMiddleware, gameController.getDailyTaste);
router.post('/daily-taste/answer', authMiddleware, gameController.answerDailyTaste);
router.post('/movie-guess/start', authMiddleware, gameController.startMovieGuess);
router.post('/movie-guess/reveal', authMiddleware, gameController.revealMovieGuessHint);
router.post('/movie-guess/guess', authMiddleware, gameController.submitMovieGuess);
router.post('/poster-guess/start', authMiddleware, gameController.startPosterGuess);
router.post('/poster-guess/guess', authMiddleware, gameController.submitPosterGuess);

module.exports = router;
