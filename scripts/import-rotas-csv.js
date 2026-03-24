require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');
const { createRota, normalizeRotaPayload } = require('../src/models/rota');
const {
  findUserByIdMagalu,
  getRowValue,
  invalidateUserLogisticaCaches,
  parseArgs,
  parseCsvFile,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-ROTAS.csv');

function mapCsvRowToRota(row) {
  return {
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU', 'ID_MAGALU']),
    nomeRota: getRowValue(row, ['NOME_ROTA', 'ROTA', 'NOME_DA_ROTA', 'NOME']),
    horario: getRowValue(row, ['HORARIO', 'HORA', 'HORARIO_TRANSFER', 'HORARIO_DO_TRANSFER']),
  };
}

async function importRotasFromCsv({ file, dryRun }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent);
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');
  const rotasCollection = database.collection('rotas');

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const row of rows) {
    const payload = mapCsvRowToRota(row);

    if (!payload.id_magalu) {
      skippedCount += 1;
      continue;
    }

    const existingUser = await findUserByIdMagalu(usersCollection, payload.id_magalu);

    if (!existingUser) {
      notFoundCount += 1;
      continue;
    }

    let normalizedPayload;

    try {
      normalizedPayload = normalizeRotaPayload(payload);
    } catch (error) {
      skippedCount += 1;
      console.warn(`Linha ignorada para ID ${payload.id_magalu}: ${error.message}`);
      continue;
    }

    const rotaPayload = createRota({ userId: String(existingUser._id), ...normalizedPayload });
    const existingRota = await rotasCollection.findOne({ userId: existingUser._id });

    if (dryRun) {
      if (existingRota) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }
      continue;
    }

    await rotasCollection.updateOne(
      { userId: existingUser._id },
      {
        $set: {
          ...normalizedPayload,
          updatedAt: rotaPayload.updatedAt,
        },
        $setOnInsert: {
          userId: rotaPayload.userId,
          createdAt: rotaPayload.createdAt,
        },
      },
      { upsert: true }
    );

    await invalidateUserLogisticaCaches(existingUser.id_magalu, String(existingUser._id));

    if (existingRota) {
      updatedCount += 1;
    } else {
      insertedCount += 1;
    }
  }

  console.log(`Importacao concluida. Inseridos: ${insertedCount}. Atualizados: ${updatedCount}. Nao encontrados: ${notFoundCount}. Ignorados: ${skippedCount}.`);
}

const options = parseArgs(process.argv.slice(2), DEFAULT_CSV_FILE);

importRotasFromCsv(options)
  .catch((error) => {
    console.error('Falha ao importar rotas do CSV:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });