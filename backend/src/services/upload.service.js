const { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { ApiError } = require('../middleware/errorHandler');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const uploadToR2 = async (base64, mimeType, folder, identifier) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new ApiError(400, 'Görsel 5MB\'dan büyük olamaz');
  }

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `${folder}/${identifier}-${Date.now()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
};

const extractKeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
};

const deleteFromR2 = async (keyOrUrl) => {
  if (!keyOrUrl) return;
  const key = keyOrUrl.startsWith('http') ? extractKeyFromUrl(keyOrUrl) : keyOrUrl;
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (err) {
    console.error('[R2] Silme hatası:', err.message);
  }
};

const finalizeAvatar = async (tempUrl, userId) => {
  if (!tempUrl || !tempUrl.includes('temp-')) return tempUrl;

  const tempKey = extractKeyFromUrl(tempUrl);
  if (!tempKey) return tempUrl;

  const ext = tempKey.split('.').pop() || 'jpg';
  const finalKey = `avatars/${userId}-${Date.now()}.${ext}`;

  try {
    await r2.send(new CopyObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      CopySource: `${process.env.R2_BUCKET_NAME}/${tempKey}`,
      Key: finalKey,
      CacheControl: 'public, max-age=31536000',
    }));

    setImmediate(() => deleteFromR2(tempKey));

    return `${process.env.R2_PUBLIC_URL}/${finalKey}`;
  } catch (err) {
    console.error('[R2] Finalize hatası:', err.message);
    return tempUrl; // hata olursa temp URL ile devam et
  }
};

module.exports = { uploadToR2, deleteFromR2, finalizeAvatar };
