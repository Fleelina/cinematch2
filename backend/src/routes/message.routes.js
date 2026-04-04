const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/:matchId', authMiddleware, messageController.getMessages);
router.post('/:matchId', authMiddleware, messageController.sendMessage);

module.exports = router;
