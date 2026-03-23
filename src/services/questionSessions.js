const {
  getQuestionsCollection,
  getQuestionSessionCheckinsCollection,
  getQuestionSessionsCollection,
} = require('../config/collections');
const { getPalestraLabel, normalizePalestraId, PALESTRA_IDS } = require('../models/question');
const { createQuestionSession } = require('../models/questionSession');
const { SESSION_ATTENDANCE_POINTS } = require('../models/questionSessionCheckin');

function normalizeSessionDocument(session) {
  if (!session) {
    return null;
  }

  const { attendanceToken, ...restOfSession } = session;

  return {
    ...restOfSession,
    _id: String(session._id),
    palestraLabel: getPalestraLabel(session.palestraId),
  };
}

function normalizeAttendanceToken(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildSessionAttendancePath(session) {
  const attendanceToken = normalizeAttendanceToken(session && session.attendanceToken);

  if (!attendanceToken) {
    throw new Error('A sessao ativa ainda nao possui QR de presenca configurado.');
  }

  return `/checkin-presenca-palco/?token=${encodeURIComponent(attendanceToken)}`;
}

function normalizeSessionAttendanceQr(session) {
  const normalizedSession = normalizeSessionDocument(session);

  if (!normalizedSession) {
    return null;
  }

  return {
    ...normalizedSession,
    attendancePoints: SESSION_ATTENDANCE_POINTS,
    attendancePath: buildSessionAttendancePath(session),
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
    throw new Error('O palco informado para a sessao e invalido.');
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

async function getActiveSessionByAttendanceToken(attendanceToken) {
  const normalizedAttendanceToken = normalizeAttendanceToken(attendanceToken);

  if (!normalizedAttendanceToken) {
    throw new Error('O token do QR de presenca e obrigatorio.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const session = await questionSessionsCollection.findOne({
    attendanceToken: normalizedAttendanceToken,
    isActive: true,
  });

  return session || null;
}

async function getActiveSessionAttendanceQrByPalestra(palestraId) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('O palco informado para carregar o QR e invalido.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const session = await questionSessionsCollection.findOne({
    palestraId: normalizedPalestraId,
    isActive: true,
  });

  if (!session) {
    return null;
  }

  return normalizeSessionAttendanceQr(session);
}

async function getSessionAttendanceStatus(attendanceToken, userId) {
  const session = await getActiveSessionByAttendanceToken(attendanceToken);

  if (!session) {
    return null;
  }

  let alreadyCheckedIn = false;

  if (userId) {
    const questionSessionCheckinsCollection = await getQuestionSessionCheckinsCollection();
    const existingCheckin = await questionSessionCheckinsCollection.findOne({
      userId,
      sessionId: session._id,
    });

    alreadyCheckedIn = Boolean(existingCheckin);
  }

  return {
    session: normalizeSessionAttendanceQr(session),
    alreadyCheckedIn,
  };
}

async function startNewSessionForPalestra(palestraId) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('O palco informado para abrir nova sessao e invalido.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const currentActiveSession = await questionSessionsCollection.findOne({
    palestraId: normalizedPalestraId,
    isActive: true,
  });

  if (currentActiveSession) {
    throw new Error('Ja existe uma sessao ativa para este palco. Encerre a sessao atual antes de iniciar outra.');
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
    throw new Error('O palco informado para encerrar a sessao e invalido.');
  }

  const questionSessionsCollection = await getQuestionSessionsCollection();
  const activeSession = await questionSessionsCollection.findOne({
    palestraId: normalizedPalestraId,
    isActive: true,
  });

  if (!activeSession) {
    throw new Error('Nao existe sessao ativa para este palco.');
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
  getActiveSessionAttendanceQrByPalestra,
  getActiveSessionByAttendanceToken,
  getSessionAttendanceStatus,
  listActiveSessions,
  normalizeSessionAttendanceQr,
  normalizeSessionDocument,
  startNewSessionForPalestra,
};