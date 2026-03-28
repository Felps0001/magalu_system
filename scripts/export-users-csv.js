require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getUsersCollection } = require('../src/config/collections');
const { getDiretoriaByRegional } = require('../src/services/diretoria');

const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'users-completo.csv');

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

async function exportUsers() {
  const usersCollection = await getUsersCollection();

  const users = await usersCollection.find({}).sort({ nome: 1 }).toArray();

  console.log(`Total de usuarios: ${users.length}`);

  const headers = [
    'ID',
    'NOME',
    'ID_MAGALU',
    'CPF',
    'CARGO',
    'FILIAL',
    'REGIONAL',
    'DIRETORIA',
    'FIRST_ACCESS',
    'KIT',
    'KIT_EXTRA',
    'KIT_EXTRA_RETIRADA',
  ];

  const lines = [buildCsvLine(headers)];

  for (const user of users) {
    const regional = (user.regional || user.regiao || '').trim();
    const filial = (user.filial || user.loja || '').trim();
    const diretoria = getDiretoriaByRegional(regional) || (user.diretoria || '').trim();

    lines.push(buildCsvLine([
      String(user._id),
      user.nome || '',
      user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      user.firstAccessCompleted ? 'SIM' : 'NAO',
      user.kit ? 'SIM' : 'NAO',
      user.kitExtra ? 'SIM' : 'NAO',
      user.kitExtraRetirada ? 'SIM' : 'NAO',
    ]));
  }

  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`CSV salvo em: ${OUTPUT_FILE}`);
}

async function main() {
  try {
    await exportUsers();
  } catch (error) {
    console.error('Erro ao exportar:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
