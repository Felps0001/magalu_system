const {
  getQuestionsCollection,
  getQuestionSessionsCollection,
} = require('../config/collections');
const { normalizePalestraId, PALESTRA_IDS } = require('../models/question');
const { createQuestionSession } = require('../models/questionSession');

function normalizeSessionDocument(session) {
  if (!session) {
    return null;
  }

  return {
    ...session,
    _id: String(session._id),
  };
}

async function attachLegacyQuestionsToSession({ questionsCollection, palestraId, session }) {
  await questionsCollection.updateMany(
    {
      palestraId,
      $or: [
        { sessionId: { $exists: false } },
        { sessionId: null },
        { sessionId: '' },
      ],
    },
    {
      $set: {
        sessionId: String(session._id),
        sessionLabel: session.label,
      },
    }
  );
}

async function findLatestSession(questionSessionsCollection, palestraId) {
  return questionSessionsCollection.find({ palestraId }).sort({ sequence: -1, startedAt: -1 }).limit(1).next();
}

async function ensureActiveSessionForPalestra(palestraId) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('A palestra informada para a sessao e invalida.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const questionsCollection = await getQuestionsCollection();

  let session = await questionSessionsCollection.findOne({
    palestraId: normalizedPalestraId,
    isActive: true,
  });

  if (!session) {
    const latestSession = await findLatestSession(questionSessionsCollection, normalizedPalestraId);
    const nextSequence = latestSession ? latestSession.sequence + 1 : 1;
    const newSession = createQuestionSession({
      palestraId: normalizedPalestraId,
      sequence: nextSequence,
    });
    const insertResult = await questionSessionsCollection.insertOne(newSession);

    session = {
      _id: insertResult.insertedId,
      ...newSession,
    };
  }

  await attachLegacyQuestionsToSession({
    questionsCollection,
    palestraId: normalizedPalestraId,
    session,
  });

  return normalizeSessionDocument(session);
}

async function listActiveSessions({ palestraId } = {}) {
  if (palestraId) {
    const session = await ensureActiveSessionForPalestra(palestraId);
    return [session];
  }

  const sessions = await Promise.all(
    PALESTRA_IDS.map((currentPalestraId) => ensureActiveSessionForPalestra(currentPalestraId))
  );

  return sessions;
}

async function startNewSessionForPalestra(palestraId) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('A palestra informada para abrir nova sessao e invalida.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const timestamp = new Date().toISOString();
  const latestSession = await findLatestSession(questionSessionsCollection, normalizedPalestraId);
  const nextSequence = latestSession ? latestSession.sequence + 1 : 1;

  await questionSessionsCollection.updateMany(
    {
      palestraId: normalizedPalestraId,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        endedAt: timestamp,
        updatedAt: timestamp,
      },
    }
  );

  const newSession = createQuestionSession({
    palestraId: normalizedPalestraId,
    sequence: nextSequence,
  });
  const insertResult = await questionSessionsCollection.insertOne(newSession);

  return normalizeSessionDocument({
    _id: insertResult.insertedId,
    ...newSession,
  });
}

module.exports = {
  ensureActiveSessionForPalestra,
  listActiveSessions,
  normalizeSessionDocument,
  startNewSessionForPalestra,
};