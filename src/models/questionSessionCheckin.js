const { ObjectId } = require('mongodb');

const { getPalestraLabel, normalizePalestraId } = require('./question');

const SESSION_ATTENDANCE_POINTS = 5;

function toObjectId(value, fieldName) {
  if (!value) {
    throw new Error(`O campo ${fieldName} e obrigatorio.`);
  }

  if (value instanceof ObjectId) {
    return value;
  }

  if (!ObjectId.isValid(value)) {
    throw new Error(`O campo ${fieldName} e invalido.`);
  }

  return new ObjectId(value);
}

function createQuestionSessionCheckin({ userId, sessionId, palestraId, pontos = SESSION_ATTENDANCE_POINTS, checkinEm }) {
  const normalizedPalestraId = normalizePalestraId(palestraId);

  if (!normalizedPalestraId) {
    throw new Error('O palco informado para o check-in e invalido.');
  }

  return {
    userId: toObjectId(userId, 'userId'),
    sessionId: toObjectId(sessionId, 'sessionId'),
    palestraId: normalizedPalestraId,
    palestraLabel: getPalestraLabel(normalizedPalestraId),
    pontos: Number(pontos),
    checkinEm: checkinEm ? new Date(checkinEm) : new Date(),
  };
}

module.exports = {
  SESSION_ATTENDANCE_POINTS,
  createQuestionSessionCheckin,
};