const { ObjectId } = require('mongodb');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHospedagemPayload(payload = {}) {
  const nomeHotel = normalizeString(payload.nomeHotel);
  const checkIn = normalizeString(payload.checkIn);
  const checkOut = normalizeString(payload.checkOut);
  const enderecoHotel = normalizeString(payload.enderecoHotel);

  if (!nomeHotel) {
    throw new Error('O campo nomeHotel e obrigatorio.');
  }

  if (!checkIn) {
    throw new Error('O campo checkIn e obrigatorio.');
  }

  if (!checkOut) {
    throw new Error('O campo checkOut e obrigatorio.');
  }

  if (!enderecoHotel) {
    throw new Error('O campo enderecoHotel e obrigatorio.');
  }

  return {
    nomeHotel,
    checkIn,
    checkOut,
    enderecoHotel,
  };
}

function createHospedagem({ userId, ...payload }) {
  if (!ObjectId.isValid(userId)) {
    throw new Error('O userId informado para a hospedagem e invalido.');
  }

  const timestamp = new Date().toISOString();

  return {
    userId: new ObjectId(userId),
    ...normalizeHospedagemPayload(payload),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

module.exports = {
  createHospedagem,
  normalizeHospedagemPayload,
};