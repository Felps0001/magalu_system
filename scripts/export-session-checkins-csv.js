require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const {
  getQuestionSessionCheckinsCollection,
  getUsersCollection,
  getQuestionSessionsCollection,
} = require('../src/config/collections');
const { getDiretoriaByRegional } = require('../src/services/diretoria');

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

function getElapsedMinutes(startedAt, checkinEm) {
  if (!startedAt || !checkinEm) return null;
  const diffMs = new Date(checkinEm) - new Date(startedAt);
  return Math.round(diffMs / 60000);
}

function getPontualidadeStatus(minutes) {
  if (minutes == null) return '';
  if (minutes <= 5) return 'Pontual';
  if (minutes <= 15) return 'Moderado';
  return 'Atrasado';
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
    'CPF',
    'ID_MAGALU',
    'FILIAL',
    'CARGO',
    'REGIONAL',
    'DIRETORIA',
    'TURMA',
    'PALCO',
    'SESSAO',
    'PONTOS',
    'SESSAO_INICIO',
    'CHECKIN_EM',
    'TEMPO_MIN',
    'PONTUALIDADE',
  ];

  const lines = [buildCsvLine(headers)];

  for (const checkin of checkins) {
    const user = checkin.user || {};
    const session = checkin.session || {};
    const regional = (user.regional || user.regiao || '').trim();
    const filial = (user.filial || user.loja || '').trim();
    const diretoria = getDiretoriaByRegional(regional) || (user.diretoria || '').trim();
    const elapsedMin = getElapsedMinutes(session.startedAt, checkin.checkinEm);
    const pontualidade = getPontualidadeStatus(elapsedMin);

    lines.push(buildCsvLine([
      user.nome || '',
      user.cpf || '',
      user.id_magalu || '',
      filial,
      user.cargo || '',
      regional,
      diretoria,
      user.turma || '',
      checkin.palestraLabel || checkin.palestraId || '',
      session.label || '',
      checkin.pontos || 0,
      formatDate(session.startedAt),
      formatDate(checkin.checkinEm),
      elapsedMin != null ? elapsedMin : '',
      pontualidade,
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
