const { PALESTRA_IDS, normalizePalestraId } = require('./question');

function createQuestionSession({ palestraId, sequence }) {
  const normalizedPalestraId = normalizePalestraId(palestraId);
  const normalizedSequence = Number(sequence || 1);

  if (!normalizedPalestraId || !PALESTRA_IDS.includes(normalizedPalestraId)) {
    throw new Error('A palestra informada para a sessao e invalida.');
  }

  if (!Number.isInteger(normalizedSequence) || normalizedSequence <= 0) {
    throw new Error('A sequencia da sessao informada e invalida.');
  }

  const timestamp = new Date().toISOString();

  return {
    palestraId: normalizedPalestraId,
    sequence: normalizedSequence,
    label: `Sessao ${normalizedSequence}`,
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