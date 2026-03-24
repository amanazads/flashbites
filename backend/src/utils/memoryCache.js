const store = new Map();

const now = () => Date.now();

const cacheGet = (key) => {
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }

  return entry.value;
};

const cacheSet = (key, value, ttlMs = 30000) => {
  const safeTtl = Number.isFinite(Number(ttlMs)) && Number(ttlMs) > 0 ? Number(ttlMs) : 30000;
  store.set(key, {
    value,
    expiresAt: now() + safeTtl,
  });
};

const cacheDel = (key) => {
  store.delete(key);
};

const cacheDelByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

const cacheSize = () => store.size;

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPrefix,
  cacheSize,
};
