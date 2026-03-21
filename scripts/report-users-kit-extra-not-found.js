require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-200326-KITEXTRAPE.csv');
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'MAGALU-200326-KITEXTRAPE-not-found.csv');

function parseArgs(argv) {
  const options = {
    file: DEFAULT_CSV_FILE,
    output: DEFAULT_OUTPUT_FILE,
  };

  argv.forEach((argument) => {
    if (argument.startsWith('--file=')) {
      options.file = path.resolve(process.cwd(), argument.slice('--file='.length));
      return;
    }

    if (argument.startsWith('--output=')) {
      options.output = path.resolve(process.cwd(), argument.slice('--output='.length));
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

function mapCsvRow(row) {
  return {
    id_magalu: String(row.ID_MAGALU || row.IDMAGALU || '').trim(),
    kitExtra: String(row.KIT_EXTRA || row.KITEXTRA || row.KIT_EXTRA_PE || row.KITEXTRAPE || '').trim(),
  };
}

function toCsvValue(value) {
  const normalizedValue = String(value ?? '');

  if (/[";\r\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

async function buildNotFoundReport({ file, output }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent).map(mapCsvRow).filter((row) => row.id_magalu);
  const uniqueIds = [...new Set(rows.map((row) => row.id_magalu))];
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');
  const existingUsers = await usersCollection.find({ id_magalu: { $in: uniqueIds } }, { projection: { id_magalu: 1 } }).toArray();
  const existingIds = new Set(existingUsers.map((user) => String(user.id_magalu)));
  const notFoundRows = rows.filter((row) => !existingIds.has(row.id_magalu));

  fs.mkdirSync(path.dirname(output), { recursive: true });

  const csvLines = [
    'ID_MAGALU;KIT_EXTRA;STATUS',
    ...notFoundRows.map((row) => [row.id_magalu, row.kitExtra, 'NAO_ENCONTRADO'].map(toCsvValue).join(';')),
  ];

  fs.writeFileSync(output, `${csvLines.join('\n')}\n`, 'utf8');

  console.log(`Relatorio gerado em: ${output}`);
  console.log(`Nao encontrados: ${notFoundRows.length}`);

  if (notFoundRows.length > 0) {
    const preview = notFoundRows.slice(0, 20).map((row) => row.id_magalu).join(', ');
    console.log(`Primeiros IDs nao encontrados: ${preview}`);
  }
}

const options = parseArgs(process.argv.slice(2));

buildNotFoundReport(options)
  .catch((error) => {
    console.error('Falha ao gerar relatorio de nao encontrados:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });