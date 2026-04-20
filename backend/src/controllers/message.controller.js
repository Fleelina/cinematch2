const messageService = require('../services/message.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await messageService.getConversations(req.user.userId);
  ok(res, conversations);
});

const getMessages = asyncHandler(async (req, res) => {
  const { matchId } = req.validated.params;
  const result = await messageService.fetchMessages(matchId, req.user.userId);
  ok(res, result);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { matchId } = req.validated.params;
  const { text } = req.validated.body;
  const message = await messageService.sendMessage(matchId, req.user.userId, text);
  ok(res, message);
});

module.exports = { getConversations, getMessages, sendMessage };
