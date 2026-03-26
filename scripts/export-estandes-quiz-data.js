require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getEstandesCollection } = require('../src/config/collections');

const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'estandes-quiz-data.json');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function exportEstandesQuizData() {
  const estandesCollection = await getEstandesCollection();
  const estandes = await estandesCollection.find({}, { projection: { nome: 1 } }).toArray();

  const sortedEstandes = [...estandes].sort((first, second) => {
    const firstName = String(first && first.nome ? first.nome : '');
    const secondName = String(second && second.nome ? second.nome : '');

    return firstName.localeCompare(secondName, 'pt-BR', { sensitivity: 'base' });
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    scoring: {
      scanPoints: 1,
      correctAnswerPoints: 4,
      maxPoints: 5,
    },
    estandes: sortedEstandes.map((estande) => ({
      slug: slugify(estande.nome),
      nome: estande.nome,
      estandeId: String(estande._id),
      pontos: {
        scan: 1,
        correct: 4,
        max: 5,
      },
      quizOrigin: `quiz-${slugify(estande.nome)}`,
      pagePath: `/quiz/${slugify(estande.nome)}.html`,
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      source: {
        workbookMatchedName: '',
        notes: '',
      },
    })),
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Arquivo gerado em: ${OUTPUT_FILE}`);
  console.log(`Estandes exportados: ${payload.estandes.length}`);
}

async function main() {
  try {
    await exportEstandesQuizData();
  } catch (error) {
    console.error('Erro ao exportar dados do quiz de estandes:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();