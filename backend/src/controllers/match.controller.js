const matchService = require('../services/match.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const likeUser = asyncHandler(async (req, res) => {
  // Hedef kullanıcı id'si route parametresinden gelir; giriş yapan kullanıcı ise auth middleware tarafından eklenir.
  const { targetUserId: toUserId } = req.validated.params;
  const result = await matchService.likeUser(req.user.userId, toUserId);
  ok(res, result);
});

const dislikeUser = asyncHandler(async (req, res) => {
  const { targetUserId: toUserId } = req.validated.params;
  await matchService.dislikeUser(req.user.userId, toUserId);
  ok(res, null);
});

const blockUser = asyncHandler(async (req, res) => {
  const { targetUserId } = req.validated.params;
  const result = await matchService.blockUser(req.user.userId, targetUserId);
  ok(res, result);
});

const getMatches = asyncHandler(async (req, res) => {
  // Eşleşme listesi her zaman oturumdaki kullanıcı üzerinden okunur; dışarıdan userId kabul edilmez.
  const matches = await matchService.getMatches(req.user.userId);
  ok(res, matches);
});

const getLikedMe = asyncHandler(async (req, res) => {
  const users = await matchService.getLikedMe(req.user.userId);
  ok(res, users);
});

const getILiked = asyncHandler(async (req, res) => {
  const users = await matchService.getILiked(req.user.userId);
  ok(res, users);
});

const endMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.validated.params;
  const result = await matchService.endMatch(req.user.userId, matchId);
  ok(res, result);
});

const blockMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.validated.params;
  const result = await matchService.blockMatch(req.user.userId, matchId);
  ok(res, result);
});

const unblockUser = asyncHandler(async (req, res) => {
  const { targetUserId } = req.validated.params;
  const result = await matchService.unblockUser(req.user.userId, targetUserId);
  ok(res, result);
});

module.exports = { likeUser, dislikeUser, blockUser, getMatches, getLikedMe, getILiked, endMatch, blockMatch, unblockUser };
