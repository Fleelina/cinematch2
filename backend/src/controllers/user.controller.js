const bcrypt = require('bcrypt');
const prisma = require('../prisma');
const userService = require('../services/user.service');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getProfile = asyncHandler(async (req, res) => {
  // Kendi profilini okuyan akışta kullanıcı kimliği doğrudan auth katmanından gelir.
  const user = await userService.fetchProfile(req.user.userId);
  ok(res, user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, username, bio, avatar, avatarType, profilePhotos, birthDate, showAge, gender } = req.validated.body;
  // Güncelleme alanları controller'da açıkça seçilerek istemciden gelen gereksiz veri içeri alınmaz.
  const updated = await userService.updateProfile(req.user.userId, { name, username, bio, avatar, avatarType, profilePhotos, birthDate, showAge, gender });
  ok(res, updated);
});

const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.validated.query;
  const available = await userService.isUsernameAvailable(username);
  ok(res, { available });
});

const savePushToken = asyncHandler(async (req, res) => {
  const { token } = req.validated.body;
  // Push token ayrı tutulur; cihaz değişimi veya yeniden izin alma durumlarında bağımsız güncellenebilir.
  await userService.savePushToken(req.user.userId, token);
  ok(res, null);
});

const discoverUsers = asyncHandler(async (req, res) => {
  // Keşif listesi oturumdaki kullanıcının eşleşme ve etkileşim geçmişine göre üretilir.
  const users = await userService.discoverUsers(req.user.userId);
  ok(res, users);
});

const getProfileStats = asyncHandler(async (req, res) => {
  const stats = await userService.getProfileStats(req.user.userId);
  ok(res, stats);
});

const getBlockedUsers = asyncHandler(async (req, res) => {
  const blockedUsers = await userService.getBlockedUsers(req.user.userId);
  ok(res, blockedUsers);
});

const getUserProfile = asyncHandler(async (req, res) => {
  // Public profil akışı, kendi profil detaylarından ayrıdır ve parametredeki kullanıcı id'si üzerinden okunur.
  const user = await userService.fetchPublicProfile(req.validated.params.userId);
  ok(res, user);
});

const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getPublicStats(req.validated.params.userId);
  ok(res, stats);
});

const deleteAccount = asyncHandler(async (req, res) => {
  // Kullanici silinmeden once sifre ile kimlik dogrulamasi yapilir
  const { password } = req.body;
  if (!password) throw new ApiError(400, 'Sifre gerekli');

  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { password: true } });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError(401, 'Sifre yanlis');

  await userService.deleteAccount(req.user.userId);
  ok(res, { message: 'Hesabiniz basariyla silindi' });
});

module.exports = {
  getProfile, updateProfile, checkUsername, savePushToken,
  discoverUsers, getProfileStats, getBlockedUsers, getUserProfile, getUserStats,
  deleteAccount,
};
