const { connectToMongoDB } = require('./mongodb');

async function getUsersCollection() {
  const database = await connectToMongoDB();
  return database.collection('users');
}

async function getRotasCollection() {
  const database = await connectToMongoDB();
  return database.collection('rotas');
}

async function getAereosCollection() {
  const database = await connectToMongoDB();
  return database.collection('aereos');
}

async function getEstandesCollection() {
  const database = await connectToMongoDB();
  return database.collection('estandes');
}

async function getCheckinsCollection() {
  const database = await connectToMongoDB();
  return database.collection('checkins');
}

async function getFeedCollection() {
  const database = await connectToMongoDB();
  return database.collection('feed');
}

async function getQuestionsCollection() {
  const database = await connectToMongoDB();
  return database.collection('questions');
}

async function getQuestionSessionsCollection() {
  const database = await connectToMongoDB();
  return database.collection('question_sessions');
}

async function findDuplicateCheckinsByUserAndEstande() {
  const checkinsCollection = await getCheckinsCollection();

  return checkinsCollection.aggregate([
    {
      $group: {
        _id: {
          userId: '$userId',
          estandeId: '$estandeId',
        },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        '_id.userId': { $ne: null },
        '_id.estandeId': { $ne: null },
        count: { $gt: 1 },
      },
    },
  ]).toArray();
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
  const rotasCollection = await getRotasCollection();
  const aereosCollection = await getAereosCollection();
  const checkinsCollection = await getCheckinsCollection();
  const feedCollection = await getFeedCollection();
  const questionsCollection = await getQuestionsCollection();
  const questionSessionsCollection = await getQuestionSessionsCollection();
  const duplicateUserIds = await findDuplicateUserIds();
  const duplicateCheckins = await findDuplicateCheckinsByUserAndEstande();

  const warnings = [];

  if (duplicateUserIds.length > 0) {
    const duplicatedValues = duplicateUserIds.map((item) => item._id).join(', ');
    warnings.push(`Nao foi possivel criar o indice unico de id_magalu porque existem valores duplicados na collection users: ${duplicatedValues}. O POST /api/users continua bloqueando novos duplicados, mas voce deve limpar os registros repetidos para ativar a protecao no banco.`);
  } else {
    await usersCollection.createIndex(
      { id_magalu: 1 },
      {
        unique: true,
        name: 'users_id_magalu_unique',
      }
    );
  }

  if (duplicateCheckins.length > 0) {
    const duplicatedValues = duplicateCheckins
      .map((item) => `${item._id.userId}/${item._id.estandeId}`)
      .join(', ');
    warnings.push(`Nao foi possivel criar o indice unico de check-in por usuario e estande porque existem registros duplicados na collection checkins: ${duplicatedValues}. O POST /api/checkins continua bloqueando novas duplicidades, mas voce deve limpar os registros repetidos para ativar a protecao no banco.`);
  } else {
    await checkinsCollection.createIndex(
      { userId: 1, estandeId: 1 },
      {
        unique: true,
        name: 'checkins_user_estande_unique',
      }
    );
  }

  await feedCollection.createIndex(
    { createdAt: -1 },
    {
      name: 'feed_created_at_desc',
    }
  );

  await feedCollection.createIndex(
    { authorId: 1, createdAt: -1 },
    {
      name: 'feed_author_created_at_desc',
    }
  );

  await rotasCollection.createIndex(
    { userId: 1 },
    {
      unique: true,
      name: 'rotas_user_unique',
    }
  );

  await aereosCollection.createIndex(
    { userId: 1 },
    {
      unique: true,
      name: 'aereos_user_unique',
    }
  );

  await questionsCollection.createIndex(
    { palestraId: 1, status: 1, updatedAt: -1 },
    {
      name: 'questions_palestra_status_updated_at_desc',
    }
  );

  await questionsCollection.createIndex(
    { createdAt: -1 },
    {
      name: 'questions_created_at_desc',
    }
  );

  await questionsCollection.createIndex(
    { palestraId: 1, sessionId: 1, status: 1, updatedAt: -1 },
    {
      name: 'questions_palestra_session_status_updated_at_desc',
    }
  );

  await questionSessionsCollection.createIndex(
    { palestraId: 1, isActive: 1, startedAt: -1 },
    {
      name: 'question_sessions_palestra_active_started_at_desc',
    }
  );

  await questionSessionsCollection.createIndex(
    { palestraId: 1, sequence: -1 },
    {
      name: 'question_sessions_palestra_sequence_desc',
    }
  );

  return {
    warnings,
  };
}

module.exports = {
  getAereosCollection,
  getUsersCollection,
  getRotasCollection,
  getEstandesCollection,
  getCheckinsCollection,
  getFeedCollection,
  getQuestionsCollection,
  getQuestionSessionsCollection,
  ensureDatabaseIndexes,
};