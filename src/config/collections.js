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
  const feedCollection = await getFeedCollection();
  const questionsCollection = await getQuestionsCollection();
  const questionSessionsCollection = await getQuestionSessionsCollection();
  const duplicateUserIds = await findDuplicateUserIds();

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
  getUsersCollection,
  getEstandesCollection,
  getCheckinsCollection,
  getFeedCollection,
  getQuestionsCollection,
  getQuestionSessionsCollection,
  ensureDatabaseIndexes,
};