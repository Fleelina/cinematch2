const matchService = require('../services/match.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const likeUser = asyncHandler(async (req, res) => {
  const { targetUserId: toUserId } = req.validated.params;
  const result = await matchService.likeUser(req.user.userId, toUserId);
  ok(res, result);
});

const dislikeUser = asyncHandler(async (req, res) => {
  const { targetUserId: toUserId } = req.validated.params;
  await matchService.dislikeUser(req.user.userId, toUserId);
  ok(res, null);
});

const getMatches = asyncHandler(async (req, res) => {
  const matches = await matchService.getMatches(req.user.userId);
  ok(res, matches);
});

module.exports = { likeUser, dislikeUser, getMatches };
