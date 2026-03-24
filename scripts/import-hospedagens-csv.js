require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');
const { createHospedagem, normalizeHospedagemPayload } = require('../src/models/hospedagem');
const { buildUserLogisticaFilter } = require('../src/services/userLogisticaLookup');
const {
  findUserReference,
  getRowValue,
  invalidateUserLogisticaCaches,
  parseArgs,
  parseCsvFile,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-230326-HOTEISGERAL-VINCULADO.csv');

function mapCsvRowToHospedagem(row) {
  return {
    userId: getRowValue(row, ['USER_ID', 'USERID', '_ID', 'ID_USUARIO']),
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU', 'ID_MAGALU']),
    nomeHotel: getRowValue(row, ['NOMEHOTEL', 'NOME_HOTEL', 'HOTEL', 'NOME_DO_HOTEL', 'HOSPEDAGEM']),
    checkIn: getRowValue(row, ['CHECKIN', 'CHECK_IN', 'DATA_CHECK_IN', 'ENTRADA', 'DATA_ENTRADA']),
    checkOut: getRowValue(row, ['CHECKOUT', 'CHECK_OUT', 'DATA_CHECK_OUT', 'SAIDA', 'DATA_SAIDA']),
    enderecoHotel: getRowValue(row, ['ENDERECOHOTEL', 'ENDERECO_HOTEL', 'ENDERECO', 'HOTEL_ENDERECO', 'LOCALIZACAO', 'ENDERECO_DO_HOTEL']),
  };
}

async function importHospedagensFromCsv({ file, dryRun }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent);
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');
  const hospedagensCollection = database.collection('hospedagens');

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const row of rows) {
    const payload = mapCsvRowToHospedagem(row);

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
      normalizedPayload = normalizeHospedagemPayload(payload);
    } catch (error) {
      skippedCount += 1;
      console.warn(`Linha ignorada para ID ${payload.id_magalu}: ${error.message}`);
      continue;
    }

    const hospedagemPayload = createHospedagem({ userId: String(existingUser._id), ...normalizedPayload });
    const userLogisticaFilter = buildUserLogisticaFilter(existingUser._id);
    const existingHospedagem = await hospedagensCollection.findOne(userLogisticaFilter);

    if (dryRun) {
      if (existingHospedagem) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }
      continue;
    }

    await hospedagensCollection.updateOne(
      userLogisticaFilter,
      {
        $set: {
          userId: hospedagemPayload.userId,
          ...normalizedPayload,
          updatedAt: hospedagemPayload.updatedAt,
        },
        $setOnInsert: {
          createdAt: hospedagemPayload.createdAt,
        },
      },
      { upsert: true }
    );

    await invalidateUserLogisticaCaches(existingUser.id_magalu, String(existingUser._id));

    if (existingHospedagem) {
      updatedCount += 1;
    } else {
      insertedCount += 1;
    }
  }

  console.log(`Importacao concluida. Inseridos: ${insertedCount}. Atualizados: ${updatedCount}. Nao encontrados: ${notFoundCount}. Ignorados: ${skippedCount}.`);
}

const options = parseArgs(process.argv.slice(2), DEFAULT_CSV_FILE);

importHospedagensFromCsv(options)
  .catch((error) => {
    console.error('Falha ao importar hospedagens do CSV:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });