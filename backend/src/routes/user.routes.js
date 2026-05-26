const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const userValidator = require('../validators/user.validator');

// Public username uygunluk kontrolu.
router.get('/check-username', validate(userValidator.checkUsername), userController.checkUsername);

// Profil, stats ve discover endpoint'leri authenticated kullanici baglaminda calisir.
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, validate(userValidator.updateProfile), userController.updateProfile);
router.get('/profile/stats', authMiddleware, userController.getProfileStats);
router.get('/profile/blocked', authMiddleware, userController.getBlockedUsers);
router.post('/push-token', authMiddleware, validate(userValidator.savePushToken), userController.savePushToken);
router.delete('/me', authMiddleware, userController.deleteAccount);
router.get('/discover', authMiddleware, userController.discoverUsers);

// Public user profil/stat sorgulari path'teki `userId` ile hedeflenir.
router.get('/:userId/profile', authMiddleware, validate(userValidator.getUserProfile), userController.getUserProfile);
router.get('/:userId/stats', authMiddleware, validate(userValidator.getUserProfile), userController.getUserStats);

module.exports = router;
