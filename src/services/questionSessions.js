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

async function getActiveSessionForPalestra(palestraId) {
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
    return null;
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
    const session = await getActiveSessionForPalestra(palestraId);
    return session ? [session] : [];
  }

  const sessions = await Promise.all(PALESTRA_IDS.map((currentPalestraId) => getActiveSessionForPalestra(currentPalestraId)));

  return sessions.filter(Boolean);
}

async function startNewSessionForPalestra(palestraId) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('A palestra informada para abrir nova sessao e invalida.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const currentActiveSession = await questionSessionsCollection.findOne({
    palestraId: normalizedPalestraId,
    isActive: true,
  });

  if (currentActiveSession) {
    throw new Error('Ja existe uma sessao ativa para esta palestra. Encerre a sessao atual antes de iniciar outra.');
  }

  const latestSession = await findLatestSession(questionSessionsCollection, normalizedPalestraId);
  const nextSequence = latestSession ? latestSession.sequence + 1 : 1;

  const newSession = createQuestionSession({
    palestraId: normalizedPalestraId,
    sequence: nextSequence,
  });
  const insertResult = await questionSessionsCollection.insertOne(newSession);

  const questionsCollection = await getQuestionsCollection();
  await attachLegacyQuestionsToSession({
    questionsCollection,
    palestraId: normalizedPalestraId,
    session: {
      _id: insertResult.insertedId,
      ...newSession,
    },
  });

  return normalizeSessionDocument({
    _id: insertResult.insertedId,
    ...newSession,
  });
}

async function endActiveSessionForPalestra(palestraId) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('A palestra informada para encerrar a sessao e invalida.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const activeSession = await questionSessionsCollection.findOne({
    palestraId: normalizedPalestraId,
    isActive: true,
  });

  if (!activeSession) {
    throw new Error('Nao existe sessao ativa para esta palestra.');
  }

  const timestamp = new Date().toISOString();

  await questionSessionsCollection.updateOne(
    { _id: activeSession._id },
    {
      $set: {
        isActive: false,
        endedAt: timestamp,
        updatedAt: timestamp,
      },
    }
  );

  return normalizeSessionDocument({
    ...activeSession,
    isActive: false,
    endedAt: timestamp,
    updatedAt: timestamp,
  });
}

module.exports = {
  endActiveSessionForPalestra,
  getActiveSessionForPalestra,
  listActiveSessions,
  normalizeSessionDocument,
  startNewSessionForPalestra,
};