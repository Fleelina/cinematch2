const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const messageValidator = require('../validators/message.validator');

router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/:matchId', authMiddleware, validate(messageValidator.matchIdParam), messageController.getMessages);
router.post('/:matchId', authMiddleware, validate(messageValidator.sendMessageBody), messageController.sendMessage);

module.exports = router;
