const { createHash } = require('crypto');

function normalizePassword(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hashPassword(password) {
  const normalizedPassword = normalizePassword(password);

  if (!normalizedPassword) {
    return '';
  }

  return createHash('sha256').update(normalizedPassword).digest('hex');
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    return false;
  }

  return hashPassword(password) === passwordHash;
}

module.exports = {
  hashPassword,
  normalizePassword,
  verifyPassword,
};