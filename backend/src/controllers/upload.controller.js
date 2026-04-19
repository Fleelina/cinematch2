const { uploadToR2 } = require('../services/upload.service');

const uploadAvatar = async (req, res) => {
  const { base64, mimeType = 'image/jpeg' } = req.body;
  if (!base64) return res.status(400).json({ error: 'Görsel gerekli' });

  try {
    const url = await uploadToR2(base64, mimeType, 'avatars', req.user.userId);
    res.json({ url });
  } catch (err) {
    if (err.code === 'TOO_LARGE') return res.status(400).json({ error: err.message });
    console.error('[uploadAvatar]', err);
    res.status(500).json({ error: 'Yükleme başarısız' });
  }
};

const uploadAvatarPublic = async (req, res) => {
  const { base64, mimeType = 'image/jpeg' } = req.body;
  if (!base64) return res.status(400).json({ error: 'Görsel gerekli' });

  try {
    const url = await uploadToR2(base64, mimeType, 'avatars', `temp-${Date.now()}`);
    res.json({ url });
  } catch (err) {
    if (err.code === 'TOO_LARGE') return res.status(400).json({ error: err.message });
    console.error('[uploadAvatarPublic]', err);
    res.status(500).json({ error: 'Yükleme başarısız' });
  }
};

module.exports = { uploadAvatar, uploadAvatarPublic };
