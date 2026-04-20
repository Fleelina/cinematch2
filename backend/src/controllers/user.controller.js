const userService = require('../services/user.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.fetchProfile(req.user.userId);
  ok(res, user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, username, bio, avatar, avatarType, age, showAge } = req.validated.body;
  const updated = await userService.updateProfile(req.user.userId, { name, username, bio, avatar, avatarType, age, showAge });
  ok(res, updated);
});

const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.validated.query;
  const available = await userService.isUsernameAvailable(username);
  ok(res, { available });
});

const savePushToken = asyncHandler(async (req, res) => {
  const { token } = req.validated.body;
  await userService.savePushToken(req.user.userId, token);
  ok(res, null);
});

const discoverUsers = asyncHandler(async (req, res) => {
  const users = await userService.discoverUsers(req.user.userId);
  ok(res, users);
});

const getProfileStats = asyncHandler(async (req, res) => {
  const stats = await userService.getProfileStats(req.user.userId);
  ok(res, stats);
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.fetchPublicProfile(req.validated.params.userId);
  ok(res, user);
});

const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getPublicStats(req.validated.params.userId);
  ok(res, stats);
});

module.exports = {
  getProfile, updateProfile, checkUsername, savePushToken,
  discoverUsers, getProfileStats, getUserProfile, getUserStats,
};

