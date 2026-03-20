const { ObjectId } = require('mongodb');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRotaPayload(payload = {}) {
  const nomeRota = normalizeString(payload.nomeRota);
  const horario = normalizeString(payload.horario);

  if (!nomeRota) {
    throw new Error('O campo nomeRota e obrigatorio.');
  }

  if (!horario) {
    throw new Error('O campo horario e obrigatorio.');
  }

  return {
    nomeRota,
    horario,
  };
}

function createRota({ userId, ...payload }) {
  if (!ObjectId.isValid(userId)) {
    throw new Error('O userId informado para a rota e invalido.');
  }

  const timestamp = new Date().toISOString();

  return {
    userId: new ObjectId(userId),
    ...normalizeRotaPayload(payload),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

module.exports = {
  createRota,
  normalizeRotaPayload,
};