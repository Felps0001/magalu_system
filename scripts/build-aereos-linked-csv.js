require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  getRowValue,
  normalizeIdMagalu,
  parseCsvFile,
  toCsvValue,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-AEREOS.csv');
const DEFAULT_USERS_JSON_FILE = path.resolve(__dirname, '..', '..', 'scanner-kit-magalu', 'Users.json');
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'MAGALU-AEREOS-VINCULADO.csv');

const PLACEHOLDER_NAMES = new Set([
  'NOME COMPLETO',
  'SEM GERENTE',
  'NOME',
]);

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

function mapAereoRow(row) {
  return {
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU']),
    nomeCsv: getRowValue(row, ['NOME', 'NOME_COMPLETO']),
    dataSaidaIda: getRowValue(row, ['DATA_SAIDA_IDA', 'DATASAIDAIDA']),
    companhiaIda: getRowValue(row, ['COMPANHIA_IDA', 'COMPANHIAIDA']),
    vooIda: getRowValue(row, ['VOO_IDA', 'VOOIDA']),
    origemIda: getRowValue(row, ['ORIGEM_IDA', 'ORIGEMIDA']),
    destinoIda: getRowValue(row, ['DESTINO_IDA', 'DESTINOIDA']),
    horarioIda: getRowValue(row, ['HORARIO_IDA', 'HORARIOIDA']),
    horarioChegadaIda: getRowValue(row, ['HORARIO_CHEGADA_IDA', 'HORARIOCHEGADAIDA']),
    dataChegadaIda: getRowValue(row, ['DATA_CHEGADA_IDA', 'DATACHEGADAIDA']),
    dataSaidaVolta: getRowValue(row, ['DATA_SAIDA_VOLTA', 'DATASAIDAVOLTA']),
    companhiaVolta: getRowValue(row, ['COMPANHIA_VOLTA', 'COMPANHIAVOLTA']),
    vooVolta: getRowValue(row, ['VOO_VOLTA', 'VOOVOLTA']),
    origemVolta: getRowValue(row, ['ORIGEM_VOLTA', 'ORIGEMVOLTA']),
    destinoVolta: getRowValue(row, ['DESTINO_VOLTA', 'DESTINOVOLTA']),
    horarioVolta: getRowValue(row, ['HORARIO_VOLTA', 'HORARIOVOLTA']),
    horarioChegadaVolta: getRowValue(row, ['HORARIO_CHEGADA_VOLTA', 'HORARIOCHEGADAVOLTA']),
    dataChegadaVolta: getRowValue(row, ['DATA_CHEGADA_VOLTA', 'DATACHEGADAVOLTA']),
    localizador: getRowValue(row, ['LOCALIZADOR']),
    bilhete: getRowValue(row, ['BILHETE']),
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

function buildUsersLookup(users) {
  const usersByExactId = new Map();
  const usersByNormalizedId = new Map();
  const usersByName = new Map();

  users.forEach((user) => {
    const rawIdMagalu = String(user.id_magalu || '').trim();
    const normalizedName = normalizeName(user && user.nome);

    if (normalizedName) {
      if (!usersByName.has(normalizedName)) {
        usersByName.set(normalizedName, []);
      }

      usersByName.get(normalizedName).push(user);
    }

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
    usersByName,
  };
}

function findMatchedUser(payload, lookup) {
  if (payload.id_magalu && lookup.usersByExactId.has(payload.id_magalu)) {
    return {
      user: lookup.usersByExactId.get(payload.id_magalu),
      matchType: 'ID_EXATO',
      matchedUsers: [lookup.usersByExactId.get(payload.id_magalu)],
    };
  }

  const normalizedIdMagalu = normalizeIdMagalu(payload.id_magalu);

  if (normalizedIdMagalu && lookup.usersByNormalizedId.has(normalizedIdMagalu)) {
    return {
      user: lookup.usersByNormalizedId.get(normalizedIdMagalu),
      matchType: 'ID_NORMALIZADO',
      matchedUsers: [lookup.usersByNormalizedId.get(normalizedIdMagalu)],
    };
  }

  if (isPlaceholderName(payload.nomeCsv)) {
    return {
      user: null,
      matchType: 'PLACEHOLDER_OU_VAZIO',
      matchedUsers: [],
    };
  }

  const normalizedName = normalizeName(payload.nomeCsv);
  const matchedUsers = lookup.usersByName.get(normalizedName) || [];

  if (matchedUsers.length === 1) {
    return {
      user: matchedUsers[0],
      matchType: 'NOME_EXATO',
      matchedUsers,
    };
  }

  if (matchedUsers.length > 1) {
    return {
      user: null,
      matchType: 'NOME_AMBIGUO',
      matchedUsers,
    };
  }

  return {
    user: null,
    matchType: 'NOME_NAO_ENCONTRADO',
    matchedUsers: [],
  };
}

function ensureOutputDirectory(outputFile) {
  const outputDir = path.dirname(outputFile);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function buildLinkedAereosCsv({ file, usersJson, output }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent).map(mapAereoRow);
  const users = readUsersJson(usersJson);
  const lookup = buildUsersLookup(users);

  const outputRows = rows.map((row) => {
    const { user, matchType, matchedUsers } = findMatchedUser(row, lookup);

    return {
      userId: user && user._id ? String(user._id) : '',
      id_magalu: user && user.id_magalu ? String(user.id_magalu) : row.id_magalu,
      nomeUsuarioJson: user && user.nome ? user.nome : '',
      nomeCsv: row.nomeCsv,
      dataSaidaIda: row.dataSaidaIda,
      companhiaIda: row.companhiaIda,
      vooIda: row.vooIda,
      origemIda: row.origemIda,
      destinoIda: row.destinoIda,
      horarioIda: row.horarioIda,
      horarioChegadaIda: row.horarioChegadaIda,
      dataChegadaIda: row.dataChegadaIda,
      dataSaidaVolta: row.dataSaidaVolta,
      companhiaVolta: row.companhiaVolta,
      vooVolta: row.vooVolta,
      origemVolta: row.origemVolta,
      destinoVolta: row.destinoVolta,
      horarioVolta: row.horarioVolta,
      horarioChegadaVolta: row.horarioChegadaVolta,
      dataChegadaVolta: row.dataChegadaVolta,
      localizador: row.localizador,
      bilhete: row.bilhete,
      totalUsuariosMesmoNome: matchedUsers.length,
      statusVinculo: matchType,
    };
  });

  const header = [
    'userId',
    'id_magalu',
    'nomeUsuarioJson',
    'nomeCsv',
    'dataSaidaIda',
    'companhiaIda',
    'vooIda',
    'origemIda',
    'destinoIda',
    'horarioIda',
    'horarioChegadaIda',
    'dataChegadaIda',
    'dataSaidaVolta',
    'companhiaVolta',
    'vooVolta',
    'origemVolta',
    'destinoVolta',
    'horarioVolta',
    'horarioChegadaVolta',
    'dataChegadaVolta',
    'localizador',
    'bilhete',
    'totalUsuariosMesmoNome',
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
  const nameMatchedCount = outputRows.filter((row) => row.statusVinculo === 'NOME_EXATO').length;
  const ambiguousCount = outputRows.filter((row) => row.statusVinculo === 'NOME_AMBIGUO').length;
  const placeholderCount = outputRows.filter((row) => row.statusVinculo === 'PLACEHOLDER_OU_VAZIO').length;

  console.log(`CSV vinculado gerado em ${output}`);
  console.log(`Linhas com userId: ${linkedCount}`);
  console.log(`Linhas sem vinculacao: ${notFoundCount}`);
  console.log(`Matches unicos por nome: ${nameMatchedCount}`);
  console.log(`Nomes ambiguos: ${ambiguousCount}`);
  console.log(`Placeholders ou vazios: ${placeholderCount}`);
}

const options = parseCrossArgs(process.argv.slice(2));

try {
  buildLinkedAereosCsv(options);
} catch (error) {
  console.error('Falha ao gerar CSV vinculado de aereos:', error.message);
  process.exitCode = 1;
}