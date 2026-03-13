const { createClient } = require('redis');

let redisClient;
let redisConnectPromise;
let redisEnabled = false;

function shouldUseRedis() {
  const explicitToggle = process.env.REDIS_ENABLED;

  if (typeof explicitToggle === 'string') {
    return !['0', 'false', 'no', 'off'].includes(explicitToggle.trim().toLowerCase());
  }

  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

function buildRedisOptions() {
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
      },
    };
  }

  const host = process.env.REDIS_HOST;

  if (!host) {
    return null;
  }

  return {
    socket: {
      host,
      port: Number(process.env.REDIS_PORT || 6379),
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    },
    database: Number(process.env.REDIS_DB || 0),
    password: process.env.REDIS_PASSWORD,
  };
}

async function connectToRedis() {
  if (!shouldUseRedis()) {
    redisEnabled = false;
    return null;
  }

  if (redisClient && redisClient.isReady) {
    redisEnabled = true;
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  const clientOptions = buildRedisOptions();

  if (!clientOptions) {
    redisEnabled = false;
    return null;
  }

  redisClient = createClient(clientOptions);
  redisClient.on('error', (error) => {
    redisEnabled = false;
    console.warn(`Redis indisponivel, seguindo sem cache distribuido: ${error.message}`);
  });

  redisConnectPromise = redisClient.connect()
    .then(() => {
      redisEnabled = true;
      return redisClient;
    })
    .catch((error) => {
      redisEnabled = false;
      redisClient = undefined;
      console.warn(`Nao foi possivel conectar ao Redis. O sistema continuara sem cache: ${error.message}`);
      return null;
    })
    .finally(() => {
      redisConnectPromise = undefined;
    });

  return redisConnectPromise;
}

function getRedisClient() {
  if (redisClient && redisClient.isReady) {
    redisEnabled = true;
    return redisClient;
  }

  return null;
}

function getRedisStatus() {
  if (!shouldUseRedis()) {
    return 'disabled';
  }

  return redisEnabled && redisClient && redisClient.isReady ? 'connected' : 'degraded';
}

async function closeRedisConnection() {
  if (!redisClient) {
    redisEnabled = false;
    return;
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } finally {
    redisClient = undefined;
    redisEnabled = false;
    redisConnectPromise = undefined;
  }
}

module.exports = {
  closeRedisConnection,
  connectToRedis,
  getRedisClient,
  getRedisStatus,
};