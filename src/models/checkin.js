const { ObjectId } = require('mongodb');

function toObjectId(value, fieldName) {
  if (!value) {
    throw new Error(`O campo ${fieldName} e obrigatorio.`);
  }

  return new ObjectId(value);
}

function createCheckin({ userId, estandeId, pontos = 0, tempo = 0, checkinEm }) {
  return {
    userId: toObjectId(userId, 'userId'),
    estandeId: toObjectId(estandeId, 'estandeId'),
    pontos: Number(pontos),
    tempo: Number(tempo),
    checkinEm: checkinEm ? new Date(checkinEm) : new Date(),
  };
}

module.exports = {
  createCheckin,
};