require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getCheckinsCollection } = require('../src/config/collections');
const { getDiretoriaByRegional } = require('../src/services/diretoria');

const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'checkins-estandes.csv');

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

async function exportEstandeCheckins() {
  const checkinsCollection = await getCheckinsCollection();

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
        from: 'estandes',
        localField: 'estandeId',
        foreignField: '_id',
        as: 'estande',
      },
    },
    {
      $unwind: {
        path: '$estande',
        preserveNullAndEmptyArrays: true,
      },
    },
    { $sort: { checkinEm: 1 } },
  ]).toArray();

  console.log(`Total de check-ins em estandes: ${checkins.length}`);

  const headers = [
    'ESTANDE',
    'NOME',
    'ID_MAGALU',
    'CPF',
    'CARGO',
    'FILIAL',
    'REGIONAL',
    'DIRETORIA',
    'PONTOS',
    'TEMPO',
    'CHECKIN_EM',
  ];

  const lines = [buildCsvLine(headers)];

  for (const checkin of checkins) {
    const user = checkin.user || {};
    const estande = checkin.estande || {};
    const regional = (user.regional || user.regiao || '').trim();
    const filial = (user.filial || user.loja || '').trim();
    const diretoria = getDiretoriaByRegional(regional) || (user.diretoria || '').trim();

    lines.push(buildCsvLine([
      estande.nome || '',
      user.nome || '',
      user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      checkin.pontos || 0,
      checkin.tempo || 0,
      formatDate(checkin.checkinEm),
    ]));
  }

  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`CSV salvo em: ${OUTPUT_FILE}`);
}

async function main() {
  try {
    await exportEstandeCheckins();
  } catch (error) {
    console.error('Erro ao exportar:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
