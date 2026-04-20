const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const matchValidator = require('../validators/match.validator');

router.post('/like/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.likeUser);
router.post('/dislike/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.dislikeUser);
router.get('/', authMiddleware, matchController.getMatches);

module.exports = router;

