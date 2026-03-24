const { ObjectId } = require('mongodb');

const { buildCacheKey, deleteCacheByPrefix, deleteCacheKeys } = require('../src/services/cache');

function splitCsvLine(line, delimiter = ';') {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];

      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function normalizeHeader(header) {
  return String(header || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvFile(content) {
  const normalizedContent = content.replace(/^\uFEFF/, '');
  const lines = normalizedContent
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('O arquivo CSV esta vazio.');
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index]);
    const row = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || '';
    });

    rows.push(row);
  }

  return rows;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIdMagalu(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (/^\d+$/.test(normalizedValue)) {
    const withoutLeadingZeros = normalizedValue.replace(/^0+(?=\d)/, '');
    return withoutLeadingZeros || '0';
  }

  return normalizedValue;
}

function parseBoolean(value) {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return ['1', 'true', 't', 'sim', 's', 'yes', 'y', 'x'].includes(normalizedValue);
}

function getRowValue(row, aliases) {
  for (const alias of aliases) {
    const value = normalizeText(row[normalizeHeader(alias)]);

    if (value) {
      return value;
    }
  }

  return '';
}

function parseArgs(argv, defaultFile) {
  const options = {
    file: defaultFile,
    dryRun: false,
  };

  argv.forEach((argument) => {
    if (argument === '--dry-run') {
      options.dryRun = true;
      return;
    }

    if (argument.startsWith('--file=')) {
      options.file = argument.slice('--file='.length);
    }
  });

  return options;
}

async function findUserByIdMagalu(usersCollection, idMagalu) {
  return usersCollection.findOne({ id_magalu: idMagalu });
}

async function findUserReference(usersCollection, payload = {}) {
  const rawUserId = normalizeText(payload.userId);

  if (rawUserId && ObjectId.isValid(rawUserId)) {
    const userByObjectId = await usersCollection.findOne({ _id: new ObjectId(rawUserId) });

    if (userByObjectId) {
      return userByObjectId;
    }
  }

  const rawIdMagalu = normalizeText(payload.id_magalu);

  if (!rawIdMagalu) {
    return null;
  }

  const exactUser = await findUserByIdMagalu(usersCollection, rawIdMagalu);

  if (exactUser) {
    return exactUser;
  }

  const normalizedIdMagalu = normalizeIdMagalu(rawIdMagalu);

  if (!normalizedIdMagalu || normalizedIdMagalu === rawIdMagalu) {
    return null;
  }

  return findUserByIdMagalu(usersCollection, normalizedIdMagalu);
}

function toCsvValue(value) {
  const normalizedValue = String(value ?? '');

  if (/[";\r\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

async function invalidateUserLogisticaCaches(idMagalu, userId) {
  const cacheKeys = [
    buildCacheKey(['auth', 'login', idMagalu]),
    buildCacheKey(['users', 'list']),
    buildCacheKey(['users', 'agenda']),
    buildCacheKey(['users', userId, 'kit']),
    buildCacheKey(['users', userId, 'qrcode']),
  ];

  await deleteCacheKeys(cacheKeys);
  await deleteCacheByPrefix('feed:');
}

module.exports = {
  findUserByIdMagalu,
  findUserReference,
  getRowValue,
  invalidateUserLogisticaCaches,
  normalizeIdMagalu,
  normalizeText,
  parseArgs,
  parseBoolean,
  parseCsvFile,
  toCsvValue,
};