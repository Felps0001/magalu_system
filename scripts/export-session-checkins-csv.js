require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const {
  getQuestionSessionCheckinsCollection,
  getUsersCollection,
  getQuestionSessionsCollection,
} = require('../src/config/collections');

const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'session-checkins-pontualidade.csv');

function formatDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function escapeCsvField(value) {
  const text = String(value == null ? '' : value);

  if (text.includes(';') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsvLine(fields) {
  return fields.map(escapeCsvField).join(';');
}

async function exportSessionCheckins() {
  const checkinsCollection = await getQuestionSessionCheckinsCollection();

  const checkins = await checkinsCollection.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'question_sessions',
        localField: 'sessionId',
        foreignField: '_id',
        as: 'session',
      },
    },
    {
      $unwind: {
        path: '$session',
        preserveNullAndEmptyArrays: true,
      },
    },
    { $sort: { checkinEm: 1 } },
  ]).toArray();

  const headers = [
    'NOME',
    'ID_MAGALU',
    'CARGO',
    'REGIONAL',
    'DIRETORIA',
    'TURMA',
    'PALCO',
    'SESSAO',
    'PONTOS',
    'CHECKIN_EM',
  ];

  const lines = [buildCsvLine(headers)];

  for (const checkin of checkins) {
    const user = checkin.user || {};
    const session = checkin.session || {};

    lines.push(buildCsvLine([
      user.nome || '',
      user.id_magalu || '',
      user.cargo || '',
      user.regional || '',
      user.diretoria || '',
      user.turma || '',
      checkin.palestraLabel || checkin.palestraId || '',
      session.label || '',
      checkin.pontos || 0,
      formatDate(checkin.checkinEm),
    ]));
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');

  console.log(`CSV gerado: ${OUTPUT_FILE}`);
  console.log(`Total de check-ins de pontualidade: ${checkins.length}`);
}

async function main() {
  try {
    await exportSessionCheckins();
  } catch (error) {
    console.error('Erro ao exportar check-ins de pontualidade:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
