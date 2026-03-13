const { getRedisClient } = require('../config/redis');

function buildCacheKey(parts) {
  return parts
    .filter((part) => part !== undefined && part !== null && part !== '')
    .map((part) => String(part).trim())
    .join(':');
}

async function getOrSetJsonCache({ key, ttlSeconds, loader }) {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return loader();
  }

  try {
    const cachedValue = await redisClient.get(key);

    if (cachedValue) {
      return JSON.parse(cachedValue);
    }
  } catch (error) {
    console.warn(`Falha ao ler cache ${key}: ${error.message}`);
  }

  const freshValue = await loader();

  try {
    await redisClient.set(key, JSON.stringify(freshValue), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.warn(`Falha ao gravar cache ${key}: ${error.message}`);
  }

  return freshValue;
}

async function deleteCacheKey(key) {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.warn(`Falha ao invalidar cache ${key}: ${error.message}`);
  }
}

async function deleteCacheKeys(keys) {
  const uniqueKeys = [...new Set((keys || []).filter(Boolean))];

  if (uniqueKeys.length === 0) {
    return;
  }

  const redisClient = getRedisClient();

  if (!redisClient) {
    return;
  }

  try {
    await redisClient.del(uniqueKeys);
  } catch (error) {
    console.warn(`Falha ao invalidar cache em lote: ${error.message}`);
  }
}

async function deleteCacheByPrefix(prefix) {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return;
  }

  try {
    const keysToDelete = [];

    for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
      keysToDelete.push(key);
    }

    if (keysToDelete.length > 0) {
      await redisClient.del(keysToDelete);
    }
  } catch (error) {
    console.warn(`Falha ao invalidar cache por prefixo ${prefix}: ${error.message}`);
  }
}

module.exports = {
  buildCacheKey,
  deleteCacheByPrefix,
  deleteCacheKey,
  deleteCacheKeys,
  getOrSetJsonCache,
};