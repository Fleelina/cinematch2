// Basit in-memory cache
// Her key için { data, expiresAt } saklar

const cache = new Map();

const get = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const set = (key, data, ttlSeconds = 600) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const del = (key) => cache.delete(key);

const clear = () => cache.clear();

module.exports = { get, set, del, clear };
