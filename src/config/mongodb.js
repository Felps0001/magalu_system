const { MongoClient } = require('mongodb');

let client;
let database;

function buildMongoUri() {
  const directMongoUri = process.env.MONGODB_URI;

  if (directMongoUri) {
    if (directMongoUri.includes('SUA_SENHA_AQUI') || directMongoUri.includes('<db_password>')) {
      throw new Error('Defina a senha real do MongoDB no .env antes de iniciar o servidor.');
    }

    return directMongoUri;
  }

  const username = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const cluster = process.env.MONGODB_CLUSTER;
  const options = process.env.MONGODB_OPTIONS || '?appName=MagaluRegister';

  if (!username) {
    throw new Error('A variavel MONGODB_USER nao foi definida no arquivo .env.');
  }

  if (!password) {
    throw new Error('A variavel MONGODB_PASSWORD nao foi definida no arquivo .env.');
  }

  if (!cluster) {
    throw new Error('A variavel MONGODB_CLUSTER nao foi definida no arquivo .env.');
  }

  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cluster}/${options.startsWith('?') ? options : `?${options}`}`;
}

async function connectToMongoDB() {
  if (database) {
    return database;
  }

  const mongoUri = buildMongoUri();
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error('A variavel MONGODB_DB_NAME nao foi definida no arquivo .env.');
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  database = client.db(dbName);

  return database;
}

async function closeMongoDBConnection() {
  if (!client) {
    return;
  }

  await client.close();
  client = undefined;
  database = undefined;
}

module.exports = {
  connectToMongoDB,
  closeMongoDBConnection,
};