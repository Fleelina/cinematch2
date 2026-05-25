const { uploadToR2, getFromR2 } = require('../services/upload.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { ok } = require('../utils/response');

const uploadAvatar = asyncHandler(async (req, res) => {
  const { base64, mimeType } = req.validated.body;
  // Kimliği doğrulanmış kullanıcı için dosya anahtarı kullanıcı id'si üzerinden üretilir.
  const url = await uploadToR2(base64, mimeType, 'avatars', req.user.userId);
  ok(res, { url });
});

const uploadAvatarPublic = asyncHandler(async (req, res) => {
  const { base64, mimeType } = req.validated.body;
  // Onboarding gibi erken akışlarda geçici bir dosya anahtarıyla yükleme yapılır.
  const url = await uploadToR2(base64, mimeType, 'avatars', `temp-${Date.now()}`);
  ok(res, { url });
});

const getAvatarFile = asyncHandler(async (req, res) => {
  const key = `avatars/${req.params.filename}`;
  const object = await getFromR2(key);

  res.setHeader('Content-Type', object.ContentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  object.Body.pipe(res);
});

module.exports = { uploadAvatar, uploadAvatarPublic, getAvatarFile };
