require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-200326-KITEXTRAPE.csv');
const DEFAULT_OUTPUT_PREFIX = path.resolve(__dirname, '..', 'reports', 'users-kit-extra-db-status');

function parseArgs(argv) {
  const options = {
    file: DEFAULT_CSV_FILE,
    outputPrefix: DEFAULT_OUTPUT_PREFIX,
  };

  argv.forEach((argument) => {
    if (argument.startsWith('--file=')) {
      options.file = path.resolve(process.cwd(), argument.slice('--file='.length));
      return;
    }

    if (argument.startsWith('--output-prefix=')) {
      options.outputPrefix = path.resolve(process.cwd(), argument.slice('--output-prefix='.length));
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
    id_magalu: String(row.ID_MAGALU || row.IDMAGALU || '').trim(),
    kitExtraCsv: String(row.KIT_EXTRA || row.KITEXTRA || row.KIT_EXTRA_PE || row.KITEXTRAPE || '').trim(),
    nomeCsv: String(row.NOME || row.NOME_COMPLETO || row.nome || '').trim(),
    cargoCsv: String(row.CARGO || row.cargo || '').trim(),
  };
}

function toCsvValue(value) {
  const normalizedValue = String(value ?? '');

  if (/[";\r\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

async function buildKitExtraStatusReport({ file, outputPrefix }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent).map(mapCsvRow).filter((row) => row.id_magalu);
  const uniqueIds = [...new Set(rows.map((row) => row.id_magalu))];
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');
  const dbUsers = await usersCollection.find(
    { id_magalu: { $in: uniqueIds } },
    { projection: { id_magalu: 1, nome: 1, cargo: 1, kitExtra: 1, kitExtraRetirada: 1 } }
  ).toArray();
  const usersById = new Map(dbUsers.map((user) => [String(user.id_magalu), user]));

  const reportRows = rows.map((row) => {
    const matchedUser = usersById.get(row.id_magalu);

    if (!matchedUser) {
      return {
        ...row,
        encontradoNoBanco: 'false',
        kitExtraBanco: '',
        kitExtraRetiradaBanco: '',
        nomeBanco: '',
        cargoBanco: '',
        status: 'NAO_ENCONTRADO',
      };
    }

    const hasKitExtra = Boolean(matchedUser.kitExtra);

    return {
      ...row,
      encontradoNoBanco: 'true',
      kitExtraBanco: String(hasKitExtra),
      kitExtraRetiradaBanco: String(Boolean(matchedUser.kitExtraRetirada)),
      nomeBanco: matchedUser.nome || '',
      cargoBanco: matchedUser.cargo || '',
      status: hasKitExtra ? 'KIT_EXTRA_TRUE_NO_BANCO' : 'ENCONTRADO_SEM_KIT_EXTRA_TRUE',
    };
  });

  const matchedWithKitExtraTrue = reportRows.filter((row) => row.status === 'KIT_EXTRA_TRUE_NO_BANCO');
  const baseDir = path.dirname(outputPrefix);
  const baseName = path.basename(outputPrefix);
  const fullReportPath = path.join(baseDir, `${baseName}.csv`);
  const trueOnlyReportPath = path.join(baseDir, `${baseName}-kit-extra-true.csv`);

  fs.mkdirSync(baseDir, { recursive: true });

  const headers = [
    'ID_MAGALU',
    'KIT_EXTRA_CSV',
    'NOME_CSV',
    'CARGO_CSV',
    'ENCONTRADO_NO_BANCO',
    'KIT_EXTRA_BANCO',
    'KIT_EXTRA_RETIRADA_BANCO',
    'NOME_BANCO',
    'CARGO_BANCO',
    'STATUS',
  ];

  const fullCsvLines = [
    headers.join(';'),
    ...reportRows.map((row) => [
      row.id_magalu,
      row.kitExtraCsv,
      row.nomeCsv,
      row.cargoCsv,
      row.encontradoNoBanco,
      row.kitExtraBanco,
      row.kitExtraRetiradaBanco,
      row.nomeBanco,
      row.cargoBanco,
      row.status,
    ].map(toCsvValue).join(';')),
  ];

  const trueOnlyCsvLines = [
    headers.join(';'),
    ...matchedWithKitExtraTrue.map((row) => [
      row.id_magalu,
      row.kitExtraCsv,
      row.nomeCsv,
      row.cargoCsv,
      row.encontradoNoBanco,
      row.kitExtraBanco,
      row.kitExtraRetiradaBanco,
      row.nomeBanco,
      row.cargoBanco,
      row.status,
    ].map(toCsvValue).join(';')),
  ];

  fs.writeFileSync(fullReportPath, `${fullCsvLines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(trueOnlyReportPath, `${trueOnlyCsvLines.join('\n')}\n`, 'utf8');

  const notFoundCount = reportRows.filter((row) => row.status === 'NAO_ENCONTRADO').length;
  const foundWithoutKitExtraTrueCount = reportRows.filter((row) => row.status === 'ENCONTRADO_SEM_KIT_EXTRA_TRUE').length;

  console.log(`Relatorio completo gerado em: ${fullReportPath}`);
  console.log(`Relatorio com kitExtra=true no banco gerado em: ${trueOnlyReportPath}`);
  console.log(`Total no CSV: ${reportRows.length}`);
  console.log(`Com kitExtra=true no banco: ${matchedWithKitExtraTrue.length}`);
  console.log(`Encontrados sem kitExtra=true: ${foundWithoutKitExtraTrueCount}`);
  console.log(`Nao encontrados: ${notFoundCount}`);
}

const options = parseArgs(process.argv.slice(2));

buildKitExtraStatusReport(options)
  .catch((error) => {
    console.error('Falha ao gerar relatorio de status do kitExtra:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });