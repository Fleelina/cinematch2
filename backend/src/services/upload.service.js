const { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { ApiError } = require('../middleware/errorHandler');

// Cloudflare R2, S3 uyumlu client ile kullanilir.
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const getPublicBaseUrl = () => {
  const value = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

// Base64 gorseli boyut kontrolunden gecirip R2'ye yukler.
// Dosya anahtari folder + identifier + timestamp ile uretildigi icin cakisma riski dusuktur.
const uploadToR2 = async (base64, mimeType, folder, identifier) => {
  const base64Data = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new ApiError(400, 'Gorsel 5MB\'dan buyuk olamaz');
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

  return `${getPublicBaseUrl()}/${key}`;
};

// Public URL'den bucket icindeki object key'i cikarir.
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const { pathname } = new URL(normalizedUrl);
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
};

// Silme islemi best-effort calisir; hata uygulama akisina yansitilmaz.
const deleteFromR2 = async (keyOrUrl) => {
  if (!keyOrUrl) return;
  const key = /^https?:\/\//i.test(keyOrUrl) || keyOrUrl.includes('/avatars/')
    ? extractKeyFromUrl(keyOrUrl)
    : keyOrUrl;
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (err) {
    console.error('[R2] Silme hatasi:', err.message);
  }
};

const getFromR2 = async (key) => {
  if (!key || key.includes('..') || key.startsWith('/')) {
    throw new ApiError(400, 'Gecersiz gorsel yolu');
  }

  try {
    return await r2.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
  } catch {
    throw new ApiError(404, 'Gorsel bulunamadi');
  }
};

// Temp avatar'i kalici alana kopyalar.
// Kopyalama basariliysa temp obje async olarak silinir.
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

    return `${getPublicBaseUrl()}/${finalKey}`;
  } catch (err) {
    console.error('[R2] Finalize hatasi:', err.message);
    return tempUrl; // Finalize basarisizsa mevcut temp URL ile devam edilir.
  }
};

module.exports = { uploadToR2, deleteFromR2, finalizeAvatar, getFromR2 };
