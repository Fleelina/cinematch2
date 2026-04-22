const messageService = require('../services/message.service');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const getConversations = asyncHandler(async (req, res) => {
  // Kullanıcının görebileceği konuşmalar oturum bilgisine göre filtrelenir.
  const conversations = await messageService.getConversations(req.user.userId);
  ok(res, conversations);
});

const getMessages = asyncHandler(async (req, res) => {
  const { matchId } = req.validated.params;
  // İlgili konuşmaya erişim yetkisi service katmanında match-kullanıcı ilişkisi üzerinden doğrulanır.
  const result = await messageService.fetchMessages(matchId, req.user.userId);
  ok(res, result);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { matchId } = req.validated.params;
  const { text, movieId } = req.validated.body;
  // movieId opsiyoneldir; varsa mesaj ortak film bağlamıyla birlikte işlenir.
  const message = await messageService.sendMessage(matchId, req.user.userId, text, movieId || null);
  ok(res, message);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { scope } = req.body; // 'me' | 'all'
  if (!['me', 'all'].includes(scope)) throw new ApiError(400, 'Gecersiz scope');
  const result = await messageService.deleteMessage(messageId, req.user.userId, scope);
  ok(res, result);
});

module.exports = { getConversations, getMessages, sendMessage, deleteMessage };
