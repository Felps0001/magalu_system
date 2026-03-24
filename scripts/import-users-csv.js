require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');
const { createUser, createUserQrPayload } = require('../src/models/user');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-DADOSPESSOAIS.csv');

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

function mapCsvRowToUser(row) {
  return {
    regional: row.REGIONAL || '',
    filial: row.FILIAL || '',
    id_magalu: row.ID_MAGALU || '',
    nome: row.NOME || '',
    cargo: row.CARGO || '',
    cpf: row.CPF || '',
  };
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

async function importUsersFromCsv({ file, dryRun }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent);
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const payload = mapCsvRowToUser(row);

    if (!payload.id_magalu) {
      skippedCount += 1;
      continue;
    }

    const existingUser = await usersCollection.findOne({ id_magalu: payload.id_magalu });
    const normalizedUser = createUser(payload);
    const timestamp = new Date().toISOString();
    const userId = existingUser?._id || new ObjectId();
    const qrCodePayload = createUserQrPayload({ _id: userId, ...normalizedUser }, timestamp);

    if (dryRun) {
      if (existingUser) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }
      continue;
    }

    if (existingUser) {
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            nome: normalizedUser.nome,
            cpf: normalizedUser.cpf,
            regional: normalizedUser.regional,
            diretoria: normalizedUser.diretoria,
            filial: normalizedUser.filial,
            cargo: normalizedUser.cargo,
            qrCodeGeneratedAt: timestamp,
            qrCodePayload,
            updatedAt: timestamp,
          },
          $unset: {
            regiao: '',
            loja: '',
            turma: '',
            cidade: '',
            transfer: '',
            hospedagem: '',
            aereo: '',
          },
        }
      );

      updatedCount += 1;
      continue;
    }

    await usersCollection.insertOne({
      _id: userId,
      ...normalizedUser,
      qrCodeGeneratedAt: timestamp,
      qrCodePayload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    insertedCount += 1;
  }

  console.log(`Importacao concluida. Inseridos: ${insertedCount}. Atualizados: ${updatedCount}. Ignorados: ${skippedCount}.`);
}

const options = parseArgs(process.argv.slice(2));

importUsersFromCsv(options)
  .catch((error) => {
    console.error('Falha ao importar users do CSV:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });
