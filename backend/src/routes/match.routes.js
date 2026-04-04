const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/like/:targetUserId', authMiddleware, matchController.likeUser);
router.post('/dislike/:targetUserId', authMiddleware, matchController.dislikeUser);
router.get('/', authMiddleware, matchController.getMatches);

module.exports = router;
