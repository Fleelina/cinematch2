const express = require('express');
const router = express.Router();
const { uploadAvatar, uploadAvatarPublic, getAvatarFile } = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const uploadValidator = require('../validators/upload.validator');
const { publicAvatarUploadLimiter } = require('../middleware/rateLimiters');

// Avatar upload endpoint'i auth gerektirir; public varyant onboarding gibi akislar icindir.
router.post('/avatar', authMiddleware, validate(uploadValidator.avatarBody), uploadAvatar);
router.post('/avatar/public', publicAvatarUploadLimiter, validate(uploadValidator.avatarBody), uploadAvatarPublic);
router.get('/avatar-file/:filename', getAvatarFile);

module.exports = router;
