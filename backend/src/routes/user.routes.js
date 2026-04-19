const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public (auth gerektirmez)
router.get('/check-username', userController.checkUsername);

// Auth gerektirir
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/profile/stats', authMiddleware, userController.getProfileStats);
router.get('/characters/search', authMiddleware, userController.searchCharacters);
router.get('/discover', authMiddleware, userController.discoverUsers);
router.get('/:userId/profile', authMiddleware, userController.getUserProfile);
router.get('/:userId/stats', authMiddleware, userController.getUserStats);

module.exports = router;
