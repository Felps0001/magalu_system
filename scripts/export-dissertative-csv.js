require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getDissertativeAnswersCollection } = require('../src/config/collections');
const { getDiretoriaByRegional } = require('../src/services/diretoria');

const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'perguntas-dissertativas.csv');

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

function getAnswerByKey(answers, key) {
  if (!Array.isArray(answers)) return null;
  return answers.find((a) => a.questionKey === key) || null;
}

async function exportDissertativeAnswers() {
  const collection = await getDissertativeAnswersCollection();

  const submissions = await collection.aggregate([
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
    { $sort: { createdAt: 1 } },
  ]).toArray();

  console.log(`Total de submissões dissertativas: ${submissions.length}`);

  const headers = [
    'NOME',
    'ID_MAGALU',
    'CARGO',
    'FILIAL',
    'REGIONAL',
    'DIRETORIA',
    'RESPOSTA_LUIZA',
    'RESPOSTA_FRED',
    'RESPOSTA_PALESTRA',
    'TOTAL_RESPOSTAS',
    'PONTOS',
    'COMPLETA',
    'CRIADO_EM',
    'ATUALIZADO_EM',
    'CONCLUIDO_EM',
  ];

  const lines = [buildCsvLine(headers)];

  for (const submission of submissions) {
    const user = submission.user || {};
    const regional = (user.regional || user.regiao || '').trim();
    const filial = (user.filial || user.loja || '').trim();
    const diretoria = getDiretoriaByRegional(regional) || (user.diretoria || '').trim();

    const luiza = getAnswerByKey(submission.answers, 'luiza');
    const fred = getAnswerByKey(submission.answers, 'fred');
    const palestra = getAnswerByKey(submission.answers, 'palestra');

    const totalRespostas = [luiza, fred, palestra].filter(Boolean).length;

    lines.push(buildCsvLine([
      submission.authorName || user.nome || '',
      submission.authorIdMagalu || user.id_magalu || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      luiza ? luiza.answerText : '',
      fred ? fred.answerText : '',
      palestra ? palestra.answerText : '',
      totalRespostas,
      submission.pontos || 0,
      submission.isComplete ? 'Sim' : 'Não',
      formatDate(submission.createdAt),
      formatDate(submission.updatedAt),
      formatDate(submission.completedAt),
    ]));
  }

  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`CSV salvo em: ${OUTPUT_FILE}`);
  console.log(`Total de linhas (sem header): ${lines.length - 1}`);
}

async function main() {
  try {
    await exportDissertativeAnswers();
  } catch (error) {
    console.error('Erro ao exportar dissertativas:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
