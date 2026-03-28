require('dotenv').config();

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getCheckinsCollection } = require('../src/config/collections');
const { connectToRedis, closeRedisConnection, getRedisClient } = require('../src/config/redis');

async function fixCheckinsPontos() {
  const checkinsCollection = await getCheckinsCollection();

  const countBefore = await checkinsCollection.countDocuments({ pontos: 1 });
  console.log(`Check-ins com pontos = 1 encontrados: ${countBefore}`);

  if (countBefore === 0) {
    console.log('Nenhum check-in para corrigir.');
    return;
  }

  const result = await checkinsCollection.updateMany(
    { pontos: 1 },
    { $set: { pontos: 5 } }
  );

  console.log(`Check-ins atualizados: ${result.modifiedCount}`);

  try {
    await connectToRedis();
    const redisClient = getRedisClient();

    if (redisClient) {
      const keysToDelete = [];

      for await (const key of redisClient.scanIterator({ MATCH: '*', COUNT: 100 })) {
        keysToDelete.push(key);
      }

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
        console.log(`Cache Redis limpo: ${keysToDelete.length} chaves removidas.`);
      } else {
        console.log('Nenhuma chave no Redis para limpar.');
      }
    } else {
      console.log('Redis nao disponivel, cache nao limpo.');
    }
  } catch (error) {
    console.log(`Aviso: nao foi possivel limpar o Redis: ${error.message}`);
  }
}

async function main() {
  try {
    await fixCheckinsPontos();
  } catch (error) {
    console.error('Erro ao corrigir pontos:', error.message);
    process.exitCode = 1;
  } finally {
    await closeRedisConnection();
    await closeMongoDBConnection();
  }
}

main();
