const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const matchValidator = require('../validators/match.validator');

// Match etkileşimleri auth gerektirir ve hedef kullanici path param'i ile gelir.
router.post('/like/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.likeUser);
router.post('/dislike/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.dislikeUser);
router.delete('/undo/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.undoInteraction);
router.post('/block-user/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.blockUser);
router.post('/unblock/:targetUserId', authMiddleware, validate(matchValidator.targetUserIdParam), matchController.unblockUser);
router.post('/end/:matchId', authMiddleware, validate(matchValidator.matchIdParam), matchController.endMatch);
router.post('/block/:matchId', authMiddleware, validate(matchValidator.matchIdParam), matchController.blockMatch);

// Match listeleri authenticated kullanici baglaminda doner.
router.get('/', authMiddleware, matchController.getMatches);
router.get('/liked-me', authMiddleware, matchController.getLikedMe);
router.get('/i-liked', authMiddleware, matchController.getILiked);

module.exports = router;
