require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getUsersCollection } = require('../src/config/collections');
const { buildUserSummaryPipeline } = require('../src/services/userAccessPipeline');
const { getDiretoriaByRegional } = require('../src/services/diretoria');

const MIN_POINTS = 0;
const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', `usuarios-${MIN_POINTS}pts-ou-mais.csv`);

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

async function exportUsersWithMinPoints() {
  const usersCollection = await getUsersCollection();

  const pipeline = buildUserSummaryPipeline({}, { sortRanking: true });

  // Add filter for minimum points
  pipeline.push({ $match: { pontos: { $gte: MIN_POINTS } } });

  const users = await usersCollection.aggregate(pipeline).toArray();

  console.log(`Usuarios com >= ${MIN_POINTS} pontos: ${users.length}`);

  const headers = [
    'POSICAO',
    'NOME',
    'ID_MAGALU',
    'CPF',
    'CARGO',
    'FILIAL',
    'REGIONAL',
    'DIRETORIA',
    'PONTOS',
    'TOTAL_CHECKINS',
  ];

  const lines = [buildCsvLine(headers)];

  users.forEach((user, index) => {
    const regional = (user.regional || user.regiao || '').trim();
    const filial = (user.filial || user.loja || '').trim();
    const diretoria = getDiretoriaByRegional(regional) || (user.diretoria || '').trim();

    lines.push(buildCsvLine([
      index + 1,
      user.nome || '',
      user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      user.pontos || 0,
      user.totalCheckins || 0,
    ]));
  });

  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`CSV salvo em: ${OUTPUT_FILE}`);
}

async function main() {
  try {
    await exportUsersWithMinPoints();
  } catch (error) {
    console.error('Erro ao exportar:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
