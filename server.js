
require('dotenv').config();
const cluster = require('node:cluster');
const os = require('node:os');

const WORKER_COUNT = Math.min(
  Number(process.env.CLUSTER_WORKERS) || os.availableParallelism?.() || os.cpus().length,
  os.cpus().length
);
const CLUSTER_ENABLED = (process.env.CLUSTER_ENABLED || 'true').trim().toLowerCase() !== 'false'
  && WORKER_COUNT > 1;

if (CLUSTER_ENABLED && cluster.isPrimary) {
  console.log(`Primary ${process.pid} iniciando ${WORKER_COUNT} workers...`);

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    console.warn(`Worker ${worker.process.pid} encerrado (code ${code}). Reiniciando...`);
    cluster.fork();
  });
} else {
  startWorker();
}

function startWorker() {
const cors = require('cors');

const { connectToMongoDB, closeMongoDBConnection } = require('./src/config/mongodb');
const { connectToRedis, closeRedisConnection, getRedisStatus } = require('./src/config/redis');
const { ensureDatabaseIndexes } = require('./src/config/collections');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;

function parseCsvEnvList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAllowedOriginPatterns() {
  const defaultExactOrigins = [
    'https://felps0001.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const configuredOrigins = parseCsvEnvList(process.env.CORS_ALLOWED_ORIGINS);
  const exactOrigins = new Set([...defaultExactOrigins, ...configuredOrigins]);
  const configuredPagesProject = String(process.env.CLOUDFLARE_PAGES_PROJECT || '').trim();
  const patterns = [];

  if (configuredPagesProject) {
    patterns.push(new RegExp(`^https://${escapeRegex(configuredPagesProject)}\\.pages\\.dev$`, 'i'));
    patterns.push(new RegExp(`^https://[a-z0-9-]+\\.${escapeRegex(configuredPagesProject)}\\.pages\\.dev$`, 'i'));
  }

  patterns.push(/^https:\/\/[a-z0-9-]+\.pages\.dev$/i);
  patterns.push(/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i);

  return {
    exactOrigins,
    patterns,
  };
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.exactOrigins.has(origin)) {
    return true;
  }

  return allowedOrigins.patterns.some((pattern) => pattern.test(origin));
}

const allowedOrigins = buildAllowedOriginPatterns();

const corsMiddleware = cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
  },
  credentials: true,
});

const app = createApp({
  preRouteMiddlewares: [corsMiddleware],
});
let server;

async function startServer() {
  try {
    const database = await connectToMongoDB();
    await connectToRedis();
    const { warnings } = await ensureDatabaseIndexes();

    warnings.forEach((warning) => {
      console.warn(`Aviso: ${warning}`);
    });

    server = app.listen(PORT, () => {
      console.log(`Servidor Express rodando na porta ${PORT}`);
      console.log(`MongoDB conectado ao banco: ${database.databaseName}`);
      console.log(`Redis status: ${getRedisStatus()}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error.message);
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await closeMongoDBConnection();
    await closeRedisConnection();
    console.log(`Conexao com MongoDB encerrada apos sinal ${signal}.`);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao encerrar conexao com MongoDB:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

startServer();
} // end startWorker