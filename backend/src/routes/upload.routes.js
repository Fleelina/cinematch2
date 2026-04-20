const express = require('express');
const router = express.Router();
const { uploadAvatar, uploadAvatarPublic } = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const uploadValidator = require('../validators/upload.validator');

router.post('/avatar', authMiddleware, validate(uploadValidator.avatarBody), uploadAvatar);
router.post('/avatar/public', validate(uploadValidator.avatarBody), uploadAvatarPublic);

module.exports = router;
