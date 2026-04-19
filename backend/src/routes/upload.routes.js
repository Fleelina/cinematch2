const express = require('express');
const router = express.Router();
const { uploadAvatar, uploadAvatarPublic } = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Auth gerektirir (profil güncelleme)
router.post('/avatar', authMiddleware, uploadAvatar);

// Auth gerektirmez (onboarding sırasında kullanılır)
router.post('/avatar/public', uploadAvatarPublic);

module.exports = router;
