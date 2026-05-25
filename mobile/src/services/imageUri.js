import Constants from 'expo-constants';

const BASE = (Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000').replace(/\/+$/, '');

export const normalizeImageUri = (uri) => {
  if (!uri || typeof uri !== 'string') return null;
  if (/^(file:|content:|data:|blob:)/i.test(uri)) return uri;

  const normalized = /^https?:\/\//i.test(uri) ? uri : `https://${uri.replace(/^\/+/, '')}`;
  try {
    const url = new URL(normalized);
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname.endsWith('.r2.dev') && parts[0] === 'avatars' && parts[1]) {
      return `${BASE}/api/upload/avatar-file/${encodeURIComponent(parts[1])}`;
    }
  } catch {}

  return normalized;
};
