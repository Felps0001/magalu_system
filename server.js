
require('dotenv').config();
const cors = require('cors');

const { connectToMongoDB, closeMongoDBConnection } = require('./src/config/mongodb');
const { ensureDatabaseIndexes } = require('./src/config/collections');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;

const app = createApp();
app.use(cors({
  origin: [
    'https://felps0001.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));
let server;

async function startServer() {
  try {
    const database = await connectToMongoDB();
    const { warnings } = await ensureDatabaseIndexes();

    warnings.forEach((warning) => {
      console.warn(`Aviso: ${warning}`);
    });

    server = app.listen(PORT, () => {
      console.log(`Servidor Express rodando na porta ${PORT}`);
      console.log(`MongoDB conectado ao banco: ${database.databaseName}`);
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