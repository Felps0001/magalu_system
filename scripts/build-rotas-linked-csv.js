require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  getRowValue,
  normalizeIdMagalu,
  parseCsvFile,
  toCsvValue,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-ROTAS.csv');
const DEFAULT_USERS_JSON_FILE = path.resolve(__dirname, '..', '..', 'scanner-kit-magalu', 'Users.json');
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'MAGALU-ROTAS-VINCULADO.csv');

function parseCrossArgs(argv) {
  const options = {
    file: DEFAULT_CSV_FILE,
    usersJson: DEFAULT_USERS_JSON_FILE,
    output: DEFAULT_OUTPUT_FILE,
  };

  argv.forEach((argument) => {
    if (argument.startsWith('--file=')) {
      options.file = path.resolve(process.cwd(), argument.slice('--file='.length));
      return;
    }

    if (argument.startsWith('--users-json=')) {
      options.usersJson = path.resolve(process.cwd(), argument.slice('--users-json='.length));
      return;
    }

    if (argument.startsWith('--output=')) {
      options.output = path.resolve(process.cwd(), argument.slice('--output='.length));
    }
  });

  return options;
}

function mapRotaRow(row) {
  return {
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU', 'ID_MAGALU']),
    nomeCsv: getRowValue(row, ['NOME', 'NOME_COMPLETO']),
    nomeRota: getRowValue(row, ['NOME_ROTA', 'ROTA', 'NOME_DA_ROTA', 'NOMEROTA']),
    horario: getRowValue(row, ['HORARIO', 'HORA', 'HORARIO_TRANSFER', 'HORARIO_DO_TRANSFER']),
  };
}

function readUsersJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo JSON nao encontrado: ${filePath}`);
  }

  const rawContent = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const users = JSON.parse(rawContent);

  if (!Array.isArray(users)) {
    throw new Error('O arquivo JSON de usuarios precisa conter um array.');
  }

  return users;
}

function buildUsersLookup(users) {
  const usersByExactId = new Map();
  const usersByNormalizedId = new Map();

  users.forEach((user) => {
    const rawIdMagalu = String(user.id_magalu || '').trim();

    if (!rawIdMagalu) {
      return;
    }

    usersByExactId.set(rawIdMagalu, user);

    const normalizedIdMagalu = normalizeIdMagalu(rawIdMagalu);

    if (normalizedIdMagalu && !usersByNormalizedId.has(normalizedIdMagalu)) {
      usersByNormalizedId.set(normalizedIdMagalu, user);
    }
  });

  return {
    usersByExactId,
    usersByNormalizedId,
  };
}

function findMatchedUser(payload, lookup) {
  if (payload.id_magalu && lookup.usersByExactId.has(payload.id_magalu)) {
    return {
      user: lookup.usersByExactId.get(payload.id_magalu),
      matchType: 'ID_EXATO',
    };
  }

  const normalizedIdMagalu = normalizeIdMagalu(payload.id_magalu);

  if (normalizedIdMagalu && lookup.usersByNormalizedId.has(normalizedIdMagalu)) {
    return {
      user: lookup.usersByNormalizedId.get(normalizedIdMagalu),
      matchType: 'ID_NORMALIZADO',
    };
  }

  return {
    user: null,
    matchType: 'NAO_ENCONTRADO',
  };
}

function ensureOutputDirectory(outputFile) {
  const outputDir = path.dirname(outputFile);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function buildLinkedRotasCsv({ file, usersJson, output }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent).map(mapRotaRow);
  const users = readUsersJson(usersJson);
  const lookup = buildUsersLookup(users);

  const outputRows = rows.map((row) => {
    const { user, matchType } = findMatchedUser(row, lookup);

    return {
      userId: user && user._id ? String(user._id) : '',
      id_magalu: user && user.id_magalu ? String(user.id_magalu) : row.id_magalu,
      nomeUsuarioJson: user && user.nome ? user.nome : '',
      nomeCsv: row.nomeCsv,
      nomeRota: row.nomeRota,
      horario: row.horario,
      statusVinculo: matchType,
    };
  });

  const header = [
    'userId',
    'id_magalu',
    'nomeUsuarioJson',
    'nomeCsv',
    'nomeRota',
    'horario',
    'statusVinculo',
  ];

  const csvLines = [
    header.join(';'),
    ...outputRows.map((row) => header.map((column) => toCsvValue(row[column])).join(';')),
  ];

  ensureOutputDirectory(output);
  fs.writeFileSync(output, `${csvLines.join('\n')}\n`, 'utf8');

  const linkedCount = outputRows.filter((row) => row.userId).length;
  const notFoundCount = outputRows.length - linkedCount;

  console.log(`CSV vinculado gerado em ${output}`);
  console.log(`Linhas com userId: ${linkedCount}`);
  console.log(`Linhas sem vinculacao: ${notFoundCount}`);
}

const options = parseCrossArgs(process.argv.slice(2));

try {
  buildLinkedRotasCsv(options);
} catch (error) {
  console.error('Falha ao gerar CSV vinculado de rotas:', error.message);
  process.exitCode = 1;
}