const { randomUUID } = require('crypto');

const { PALESTRA_IDS, normalizePalestraId } = require('./question');

function createQuestionSession({ palestraId, sequence }) {
  const normalizedPalestraId = normalizePalestraId(palestraId);
  const normalizedSequence = Number(sequence || 1);

  if (!normalizedPalestraId || !PALESTRA_IDS.includes(normalizedPalestraId)) {
    throw new Error('O palco informado para a sessao e invalido.');
  }

  if (!Number.isInteger(normalizedSequence) || normalizedSequence <= 0) {
    throw new Error('A sequencia da sessao informada e invalida.');
  }

  const timestamp = new Date().toISOString();

  return {
    palestraId: normalizedPalestraId,
    sequence: normalizedSequence,
    label: `Sessao ${normalizedSequence}`,
    attendanceToken: randomUUID(),
    attendanceQrGeneratedAt: timestamp,
    isActive: true,
    startedAt: timestamp,
    endedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

module.exports = {
  createQuestionSession,
};