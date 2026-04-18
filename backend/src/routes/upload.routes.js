const express = require('express');
const router = express.Router();
const { uploadAvatar } = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/avatar', authMiddleware, uploadAvatar);

module.exports = router;
