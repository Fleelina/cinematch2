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

// Base64 → R2'ye yükle, public URL döndür
const uploadAvatar = async (req, res) => {
  const userId = req.user.userId;
  const { base64, mimeType = 'image/jpeg' } = req.body;

  if (!base64) return res.status(400).json({ error: 'Görsel gerekli' });

  try {
    // Base64'ü buffer'a çevir
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Boyut kontrolü — 1MB limit
    if (buffer.length > 1024 * 1024) {
      return res.status(400).json({ error: 'Görsel 1MB\'dan büyük olamaz' });
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const key = `avatars/${userId}-${Date.now()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000',
    }));

    const url = `${PUBLIC_URL}/${key}`;
    res.json({ url });
  } catch (err) {
    console.error('R2 upload hatası:', err);
    res.status(500).json({ error: 'Yükleme başarısız' });
  }
};

// R2'den sil (eski avatar değiştirilince)
const deleteAvatar = async (key) => {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error('R2 silme hatası:', err);
  }
};

module.exports = { uploadAvatar, deleteAvatar };
