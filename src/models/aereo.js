const { ObjectId } = require('mongodb');

const AEREO_FIELDS = Object.freeze([
  'companhiaIda',
  'dataSaidaIda',
  'vooIda',
  'origemIda',
  'destinoIda',
  'horarioIda',
  'horarioChegadaIda',
  'dataChegadaIda',
  'companhiaVolta',
  'dataSaidaVolta',
  'vooVolta',
  'origemVolta',
  'destinoVolta',
  'horarioVolta',
  'horarioChegadaVolta',
  'dataChegadaVolta',
  'localizador',
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAereoPayload(payload = {}) {
  const normalizedPayload = {};

  AEREO_FIELDS.forEach((fieldName) => {
    normalizedPayload[fieldName] = normalizeString(payload[fieldName]);
  });

  const hasAnyValue = AEREO_FIELDS.some((fieldName) => normalizedPayload[fieldName]);

  if (!hasAnyValue) {
    throw new Error('Informe ao menos um dado do aereo para salvar o registro.');
  }

  return normalizedPayload;
}

function createAereo({ userId, ...payload }) {
  if (!ObjectId.isValid(userId)) {
    throw new Error('O userId informado para o aereo e invalido.');
  }

  const timestamp = new Date().toISOString();

  return {
    userId: new ObjectId(userId),
    ...normalizeAereoPayload(payload),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

module.exports = {
  AEREO_FIELDS,
  createAereo,
  normalizeAereoPayload,
};