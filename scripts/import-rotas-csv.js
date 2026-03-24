require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');
const { createRota, normalizeRotaPayload } = require('../src/models/rota');
const {
  findUserReference,
  getRowValue,
  invalidateUserLogisticaCaches,
  parseArgs,
  parseCsvFile,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-ROTAS-PREENCHIDA-FINAL-2-PRONTO-IMPORT.csv');

function mapCsvRowToRota(row) {
  return {
    userId: getRowValue(row, ['USER_ID', 'USERID', '_ID', 'ID_USUARIO']),
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU', 'ID_MAGALU']),
    nomeRota: getRowValue(row, ['NOME_ROTA', 'NOMEROTA', 'ROTA', 'NOME_DA_ROTA']),
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

    if (!payload.userId && !payload.id_magalu) {
      skippedCount += 1;
      continue;
    }

    const existingUser = await findUserReference(usersCollection, payload);

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