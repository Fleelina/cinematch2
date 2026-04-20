const { uploadToR2 } = require('../services/upload.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const uploadAvatar = asyncHandler(async (req, res) => {
  const { base64, mimeType } = req.validated.body;
  const url = await uploadToR2(base64, mimeType, 'avatars', req.user.userId);
  ok(res, { url });
});

const uploadAvatarPublic = asyncHandler(async (req, res) => {
  const { base64, mimeType } = req.validated.body;
  const url = await uploadToR2(base64, mimeType, 'avatars', `temp-${Date.now()}`);
  ok(res, { url });
});

module.exports = { uploadAvatar, uploadAvatarPublic };
