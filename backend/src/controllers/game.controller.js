const gameService = require('../services/game.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getGameModes = asyncHandler(async (req, res) => {
  const data = await gameService.getGameModes(req.user.userId);
  ok(res, data);
});

const getDailyTaste = asyncHandler(async (req, res) => {
  const data = await gameService.getDailyTaste(req.user.userId);
  ok(res, data);
});

const answerDailyTaste = asyncHandler(async (req, res) => {
  const data = await gameService.answerDailyTaste(req.user.userId, req.body);
  ok(res, data);
});

const startMovieGuess = asyncHandler(async (req, res) => {
  const data = await gameService.startMovieGuess(req.user.userId);
  ok(res, data);
});

const revealMovieGuessHint = asyncHandler(async (req, res) => {
  const data = await gameService.revealMovieGuessHint(req.body.roundId, req.body.visibleHints, req.user.userId);
  ok(res, data);
});

const submitMovieGuess = asyncHandler(async (req, res) => {
  const data = await gameService.submitMovieGuess(req.body);
  ok(res, data);
});

const startPosterGuess = asyncHandler(async (req, res) => {
  const data = await gameService.startPosterGuess(req.user.userId, req.body?.source);
  ok(res, data);
});

const submitPosterGuess = asyncHandler(async (req, res) => {
  const data = await gameService.submitPosterGuess(req.body);
  ok(res, data);
});

const revealPosterGuessStage = asyncHandler(async (req, res) => {
  const data = await gameService.revealPosterGuessStage(req.body);
  ok(res, data);
});

module.exports = {
  getGameModes,
  getDailyTaste,
  answerDailyTaste,
  startMovieGuess,
  revealMovieGuessHint,
  submitMovieGuess,
  startPosterGuess,
  submitPosterGuess,
  revealPosterGuessStage,
};
