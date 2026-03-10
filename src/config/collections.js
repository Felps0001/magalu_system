const { connectToMongoDB } = require('./mongodb');

async function getUsersCollection() {
  const database = await connectToMongoDB();
  return database.collection('users');
}

async function getEstandesCollection() {
  const database = await connectToMongoDB();
  return database.collection('estandes');
}

async function getCheckinsCollection() {
  const database = await connectToMongoDB();
  return database.collection('checkins');
}

async function findDuplicateUserIds() {
  const usersCollection = await getUsersCollection();

  return usersCollection.aggregate([
    {
      $group: {
        _id: '$id_magalu',
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        _id: { $ne: null },
        count: { $gt: 1 },
      },
    },
  ]).toArray();
}

async function ensureDatabaseIndexes() {
  const usersCollection = await getUsersCollection();
  const duplicateUserIds = await findDuplicateUserIds();

  if (duplicateUserIds.length > 0) {
    const duplicatedValues = duplicateUserIds.map((item) => item._id).join(', ');

    return {
      warnings: [
        `Nao foi possivel criar o indice unico de id_magalu porque existem valores duplicados na collection users: ${duplicatedValues}. O POST /api/users continua bloqueando novos duplicados, mas voce deve limpar os registros repetidos para ativar a protecao no banco.`,
      ],
    };
  }

  await usersCollection.createIndex(
    { id_magalu: 1 },
    {
      unique: true,
      name: 'users_id_magalu_unique',
    }
  );

  return {
    warnings: [],
  };
}

module.exports = {
  getUsersCollection,
  getEstandesCollection,
  getCheckinsCollection,
  ensureDatabaseIndexes,
};