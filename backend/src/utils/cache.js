// Basit process-ici TTL cache.
// Her key icin `{ data, expiresAt }` tutulur.
const cache = new Map();

// Key varsa ve suresi dolmadiysa cache degerini doner.
const get = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

// TTL saniye cinsinden verilir; default 10 dakikadir.
const set = (key, data, ttlSeconds = 600) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

// Tekil key invalidation icin kullanilir.
const del = (key) => cache.delete(key);

// Tum cache state'ini sifirlar.
const clear = () => cache.clear();

// Expire olmus kayitlar periyodik temizlenir.
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expiresAt) cache.delete(key);
  }
}, 60_000);

module.exports = { get, set, del, clear };
