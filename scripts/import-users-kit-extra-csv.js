require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');
const { createUserQrPayload } = require('../src/models/user');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-200326-KITEXTRAPE.csv');

function parseArgs(argv) {
  const options = {
    file: DEFAULT_CSV_FILE,
    dryRun: false,
  };

  argv.forEach((argument) => {
    if (argument === '--dry-run') {
      options.dryRun = true;
      return;
    }

    if (argument.startsWith('--file=')) {
      options.file = path.resolve(process.cwd(), argument.slice('--file='.length));
    }
  });

  return options;
}

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
    .trim()
    .toUpperCase();
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

function parseBoolean(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return ['1', 'true', 't', 'sim', 's', 'yes', 'y', 'x'].includes(normalizedValue);
}

function mapCsvRow(row) {
  return {
    id_magalu: row.ID_MAGALU || row.IDMAGALU || '',
    kitExtra: parseBoolean(row.KIT_EXTRA || row.KITEXTRA || row.KIT_EXTRA_PE || row.KITEXTRAPE),
  };
}

async function importUsersKitExtraFromCsv({ file, dryRun }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent);
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');

  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const row of rows) {
    const payload = mapCsvRow(row);

    if (!payload.id_magalu) {
      skippedCount += 1;
      continue;
    }

    const existingUser = await usersCollection.findOne({ id_magalu: payload.id_magalu });

    if (!existingUser) {
      notFoundCount += 1;
      continue;
    }

    const timestamp = new Date().toISOString();
    const nextUserState = {
      ...existingUser,
      kitExtra: payload.kitExtra,
      kitExtraRetirada: payload.kitExtra ? Boolean(existingUser.kitExtraRetirada) : false,
    };
    const qrCodePayload = createUserQrPayload(nextUserState, timestamp);

    if (dryRun) {
      updatedCount += 1;
      continue;
    }

    await usersCollection.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          kitExtra: nextUserState.kitExtra,
          kitExtraRetirada: nextUserState.kitExtraRetirada,
          qrCodeGeneratedAt: timestamp,
          qrCodePayload,
          updatedAt: timestamp,
        },
      }
    );

    updatedCount += 1;
  }

  console.log(`Importacao concluida. Atualizados: ${updatedCount}. Nao encontrados: ${notFoundCount}. Ignorados: ${skippedCount}.`);
}

const options = parseArgs(process.argv.slice(2));

importUsersKitExtraFromCsv(options)
  .catch((error) => {
    console.error('Falha ao importar kitExtra do CSV:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });