const userService = require('../services/user.service');

const getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(userService.stripPassword(user));
  } catch (err) {
    console.error('[getProfile]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const { name, username, bio, avatar, avatarType, age, showAge } = req.body;

  try {
    if (username) {
      const taken = await userService.isUsernameTaken(username, userId);
      if (taken) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    }

    const updated = await userService.updateUser(userId, {
      ...(name !== undefined && { name }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(avatar !== undefined && { avatar }),
      ...(avatarType !== undefined && { avatarType }),
      ...(age !== undefined && { age: age ? parseInt(age) : null }),
      ...(showAge !== undefined && { showAge }),
    });

    res.json(userService.stripPassword(updated));
  } catch (err) {
    console.error('[updateProfile]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const checkUsername = async (req, res) => {
  const { username } = req.query;
  if (!username || username.length < 3) {
    return res.status(400).json({ available: false, error: 'En az 3 karakter olmalı' });
  }
  try {
    const available = await userService.isUsernameAvailable(username);
    res.json({ available });
  } catch (err) {
    res.status(500).json({ available: false });
  }
};

const savePushToken = async (req, res) => {
  const { token } = req.body;
  if (token === undefined) return res.status(400).json({ error: 'Token gerekli' });
  try {
    await userService.savePushToken(req.user.userId, token);
    res.json({ success: true });
  } catch (err) {
    console.error('[savePushToken]', err);
    res.status(500).json({ error: 'Token kaydedilemedi' });
  }
};

const searchCharacters = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama terimi gerekli' });
  try {
    const people = await userService.searchCharactersFromTmdb(query);
    res.json(people);
  } catch (err) {
    console.error('[searchCharacters]', err);
    res.status(500).json({ error: 'Arama başarısız' });
  }
};

const discoverUsers = async (req, res) => {
  try {
    const users = await userService.discoverUsers(req.user.userId);
    res.json(users);
  } catch (err) {
    console.error('[discoverUsers]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const getProfileStats = async (req, res) => {
  try {
    const stats = await userService.getProfileStats(req.user.userId);
    res.json(stats);
  } catch (err) {
    console.error('[getProfileStats]', err);
    res.status(500).json({ error: 'Stats alınamadı' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await userService.getPublicProfile(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(user);
  } catch (err) {
    console.error('[getUserProfile]', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const stats = await userService.getPublicStats(req.params.userId);
    res.json(stats);
  } catch (err) {
    console.error('[getUserStats]', err);
    res.status(500).json({ error: 'Stats alınamadı' });
  }
};

module.exports = {
  getProfile, updateProfile, checkUsername, savePushToken,
  searchCharacters, discoverUsers, getProfileStats, getUserProfile, getUserStats,
};
