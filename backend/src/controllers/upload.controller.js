const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Ortak yükleme mantığı
const processUpload = async (base64, mimeType, userId) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('TOO_LARGE');
  }

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `avatars/${userId || 'onboarding'}-${Date.now()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  return `${PUBLIC_URL}/${key}`;
};

// Auth gerektirir — profil güncellemede kullanılır
const uploadAvatar = async (req, res) => {
  const userId = req.user.userId;
  const { base64, mimeType = 'image/jpeg' } = req.body;
  if (!base64) return res.status(400).json({ error: 'Görsel gerekli' });

  try {
    const url = await processUpload(base64, mimeType, userId);
    res.json({ url });
  } catch (err) {
    if (err.message === 'TOO_LARGE') {
      return res.status(400).json({ error: 'Görsel 5MB\'dan büyük olamaz' });
    }
    console.error('R2 upload hatası:', err);
    res.status(500).json({ error: 'Yükleme başarısız' });
  }
};

// Auth gerektirmez — onboarding sırasında kullanılır
const uploadAvatarPublic = async (req, res) => {
  const { base64, mimeType = 'image/jpeg' } = req.body;
  if (!base64) return res.status(400).json({ error: 'Görsel gerekli' });

  try {
    const url = await processUpload(base64, mimeType, `temp-${Date.now()}`);
    res.json({ url });
  } catch (err) {
    if (err.message === 'TOO_LARGE') {
      return res.status(400).json({ error: 'Görsel 5MB\'dan büyük olamaz' });
    }
    console.error('R2 upload hatası:', err);
    res.status(500).json({ error: 'Yükleme başarısız' });
  }
};

const deleteAvatar = async (key) => {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error('R2 silme hatası:', err);
  }
};

module.exports = { uploadAvatar, uploadAvatarPublic, deleteAvatar };
