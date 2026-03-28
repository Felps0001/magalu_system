require('dotenv').config();

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getDissertativeAnswersCollection } = require('../src/config/collections');
const { normalizeExistingAnswers, DISSERTATIVE_POINTS_PER_QUESTION } = require('../src/models/dissertativeAnswer');

async function fixDissertativePontos() {
  const collection = await getDissertativeAnswersCollection();
  const allResponses = await collection.find({}).toArray();

  console.log(`Total de respostas dissertativas no banco: ${allResponses.length}`);
  console.log(`Pontos por pergunta: ${DISSERTATIVE_POINTS_PER_QUESTION}`);

  let alreadyCorrect = 0;
  let fixed = 0;

  for (const response of allResponses) {
    const normalizedAnswers = normalizeExistingAnswers(response.answers);
    const expectedPontos = normalizedAnswers.length * DISSERTATIVE_POINTS_PER_QUESTION;
    const currentPontos = response.pontos || 0;

    if (currentPontos === expectedPontos) {
      alreadyCorrect += 1;
      continue;
    }

    await collection.updateOne(
      { _id: response._id },
      { $set: { pontos: expectedPontos } }
    );

    console.log(`  Corrigido userId=${response.userId}: ${normalizedAnswers.length} respostas, ${currentPontos} -> ${expectedPontos} pontos`);
    fixed += 1;
  }

  console.log(`\nJa corretos: ${alreadyCorrect}`);
  console.log(`Corrigidos agora: ${fixed}`);
}

async function main() {
  try {
    await fixDissertativePontos();
  } catch (error) {
    console.error('Erro ao verificar dissertativas:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
