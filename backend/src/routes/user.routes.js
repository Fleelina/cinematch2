const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const userValidator = require('../validators/user.validator');

// Public
router.get('/check-username', validate(userValidator.checkUsername), userController.checkUsername);

// Auth gerektirir
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, validate(userValidator.updateProfile), userController.updateProfile);
router.get('/profile/stats', authMiddleware, userController.getProfileStats);
router.post('/push-token', authMiddleware, validate(userValidator.savePushToken), userController.savePushToken);
router.get('/discover', authMiddleware, userController.discoverUsers);
router.get('/:userId/profile', authMiddleware, validate(userValidator.getUserProfile), userController.getUserProfile);
router.get('/:userId/stats', authMiddleware, validate(userValidator.getUserProfile), userController.getUserStats);

module.exports = router;

