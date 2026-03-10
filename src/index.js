require('dotenv').config();

const { connectToMongoDB, closeMongoDBConnection } = require('./config/mongodb');

async function startApplication() {
  try {
    const database = await connectToMongoDB();

    console.log(`MongoDB conectado com sucesso ao banco: ${database.databaseName}`);
  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

startApplication();