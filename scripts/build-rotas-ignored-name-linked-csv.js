require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  getRowValue,
  parseCsvFile,
  toCsvValue,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'reports', 'MAGALU-ROTAS-PREENCHIDA-FINAL-2-IGNORADOS.csv');
const DEFAULT_USERS_JSON_FILE = path.resolve(__dirname, '..', '..', 'scanner-kit-magalu', 'Users.json');
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'MAGALU-ROTAS-PREENCHIDA-FINAL-2-IGNORADOS-CRUZADO-POR-NOME.csv');

const PLACEHOLDER_NAMES = new Set([
  'NOME COMPLETO',
  'SEM GERENTE',
  'NOME',
]);

function parseArgs(argv) {
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

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function isPlaceholderName(value) {
  const normalizedName = normalizeName(value);

  if (!normalizedName) {
    return true;
  }

  return PLACEHOLDER_NAMES.has(normalizedName);
}

function buildUsersByNameLookup(users) {
  const usersByName = new Map();

  users.forEach((user) => {
    const normalizedName = normalizeName(user && user.nome);

    if (!normalizedName) {
      return;
    }

    if (!usersByName.has(normalizedName)) {
      usersByName.set(normalizedName, []);
    }

    usersByName.get(normalizedName).push(user);
  });

  return usersByName;
}

function mapIgnoredRow(row) {
  return {
    userId: getRowValue(row, ['USER_ID', 'USERID']),
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU']),
    nomeUsuarioJson: getRowValue(row, ['NOMEUSUARIOJSON']),
    nomeCsv: getRowValue(row, ['NOMECSV', 'NOME', 'NOME_COMPLETO']),
    nomeRota: getRowValue(row, ['NOMEROTA', 'NOME_ROTA', 'ROTA']),
    horario: getRowValue(row, ['HORARIO']),
    statusVinculo: getRowValue(row, ['STATUSVINCULO']),
  };
}

function classifyNameMatch(row, usersByName) {
  if (isPlaceholderName(row.nomeCsv)) {
    return {
      user: null,
      matchedUsers: [],
      matchType: 'PLACEHOLDER_OU_VAZIO',
    };
  }

  const normalizedName = normalizeName(row.nomeCsv);
  const matchedUsers = usersByName.get(normalizedName) || [];

  if (matchedUsers.length === 1) {
    return {
      user: matchedUsers[0],
      matchedUsers,
      matchType: 'NOME_EXATO',
    };
  }

  if (matchedUsers.length > 1) {
    return {
      user: null,
      matchedUsers,
      matchType: 'NOME_AMBIGUO',
    };
  }

  return {
    user: null,
    matchedUsers,
    matchType: 'NOME_NAO_ENCONTRADO',
  };
}

function ensureOutputDirectory(outputFile) {
  const outputDir = path.dirname(outputFile);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function buildIgnoredNameLinkedCsv({ file, usersJson, output }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent).map(mapIgnoredRow);
  const users = readUsersJson(usersJson);
  const usersByName = buildUsersByNameLookup(users);

  const outputRows = rows.map((row) => {
    const { user, matchedUsers, matchType } = classifyNameMatch(row, usersByName);

    return {
      userId: row.userId,
      id_magalu: row.id_magalu,
      nomeUsuarioJson: row.nomeUsuarioJson,
      nomeCsv: row.nomeCsv,
      nomeRota: row.nomeRota,
      horario: row.horario,
      statusVinculo: row.statusVinculo,
      userIdPorNome: user && user._id ? String(user._id) : '',
      idMagaluPorNome: user && user.id_magalu ? String(user.id_magalu) : '',
      nomeUsuarioJsonPorNome: user && user.nome ? user.nome : '',
      totalUsuariosMesmoNome: matchedUsers.length,
      statusVinculoPorNome: matchType,
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
    'userIdPorNome',
    'idMagaluPorNome',
    'nomeUsuarioJsonPorNome',
    'totalUsuariosMesmoNome',
    'statusVinculoPorNome',
  ];

  const csvLines = [
    header.join(';'),
    ...outputRows.map((row) => header.map((column) => toCsvValue(row[column])).join(';')),
  ];

  ensureOutputDirectory(output);
  fs.writeFileSync(output, `${csvLines.join('\n')}\n`, 'utf8');

  const exactCount = outputRows.filter((row) => row.statusVinculoPorNome === 'NOME_EXATO').length;
  const ambiguousCount = outputRows.filter((row) => row.statusVinculoPorNome === 'NOME_AMBIGUO').length;
  const placeholderCount = outputRows.filter((row) => row.statusVinculoPorNome === 'PLACEHOLDER_OU_VAZIO').length;
  const notFoundCount = outputRows.filter((row) => row.statusVinculoPorNome === 'NOME_NAO_ENCONTRADO').length;

  console.log(`CSV cruzado por nome gerado em ${output}`);
  console.log(`Matches unicos por nome: ${exactCount}`);
  console.log(`Nomes ambiguos: ${ambiguousCount}`);
  console.log(`Placeholders ou vazios: ${placeholderCount}`);
  console.log(`Sem correspondencia por nome: ${notFoundCount}`);
}

const options = parseArgs(process.argv.slice(2));

try {
  buildIgnoredNameLinkedCsv(options);
} catch (error) {
  console.error('Falha ao cruzar ignorados de rotas por nome:', error.message);
  process.exitCode = 1;
}