require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getQuestionsCollection, getUsersCollection } = require('../src/config/collections');

const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'perguntas-sessoes.csv');

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

function getPalestraLabel(palestraId) {
  if (!palestraId) return '';
  const num = palestraId.split('-')[1];
  return `Palco ${num}`;
}

async function exportQuestions() {
  const questionsCollection = await getQuestionsCollection();
  const usersCollection = await getUsersCollection();

  const questions = await questionsCollection.find({}).sort({ createdAt: 1 }).toArray();

  console.log(`Total de perguntas: ${questions.length}`);

  // Build a map of users by _id for lookup
  const userIds = [...new Set(questions.map((q) => q.authorUserId).filter(Boolean))];
  const usersMap = new Map();

  if (userIds.length > 0) {
    const { ObjectId } = require('mongodb');
    const objectIds = userIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const users = await usersCollection.find({ _id: { $in: objectIds } }).toArray();

    for (const user of users) {
      usersMap.set(String(user._id), user);
    }
  }

  const headers = [
    'PALCO',
    'SESSAO',
    'NOME',
    'ID_MAGALU',
    'CARGO',
    'FILIAL',
    'REGIONAL',
    'STATUS',
    'PERGUNTA',
    'CRIADA_EM',
  ];

  const lines = [buildCsvLine(headers)];

  for (const question of questions) {
    const user = usersMap.get(question.authorUserId) || {};

    lines.push(buildCsvLine([
      getPalestraLabel(question.palestraId),
      question.sessionLabel || '',
      question.authorName || '',
      question.authorIdMagalu || user.id_magalu || '',
      user.cargo || '',
      user.filial || '',
      user.regional || '',
      question.status || '',
      question.texto || '',
      formatDate(question.createdAt),
    ]));
  }

  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`CSV salvo em: ${OUTPUT_FILE}`);
  console.log(`Total de linhas (sem header): ${lines.length - 1}`);
}

async function main() {
  try {
    await exportQuestions();
  } catch (error) {
    console.error('Erro ao exportar perguntas:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
