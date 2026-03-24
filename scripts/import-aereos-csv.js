require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');
const { createAereo, normalizeAereoPayload } = require('../src/models/aereo');
const {
  findUserByIdMagalu,
  getRowValue,
  invalidateUserLogisticaCaches,
  parseArgs,
  parseCsvFile,
} = require('./import-logistica-csv-utils');

const DEFAULT_CSV_FILE = path.resolve(__dirname, '..', 'MAGALU-AEREOS.csv');

function mapCsvRowToAereo(row) {
  return {
    id_magalu: getRowValue(row, ['ID_MAGALU', 'IDMAGALU', 'ID_MAGALU']),
    companhiaIda: getRowValue(row, ['COMPANHIA_IDA', 'CIA_IDA', 'COMPANHIAIDA', 'COMPANHIA_DE_IDA']),
    dataSaidaIda: getRowValue(row, ['DATA_SAIDA_IDA', 'SAIDA_IDA', 'DATAIDA', 'DATA_DE_SAIDA_IDA']),
    vooIda: getRowValue(row, ['VOO_IDA', 'VOOIDA']),
    origemIda: getRowValue(row, ['ORIGEM_IDA', 'ORIGEMIDA']),
    destinoIda: getRowValue(row, ['DESTINO_IDA', 'DESTINOIDA']),
    horarioIda: getRowValue(row, ['HORARIO_IDA', 'HORARIOIDA', 'HORA_IDA']),
    horarioChegadaIda: getRowValue(row, ['HORARIO_CHEGADA_IDA', 'CHEGADA_IDA', 'HORARIOCHEGADAIDA']),
    dataChegadaIda: getRowValue(row, ['DATA_CHEGADA_IDA', 'CHEGADA_DATA_IDA', 'DATACHEGADAIDA']),
    companhiaVolta: getRowValue(row, ['COMPANHIA_VOLTA', 'CIA_VOLTA', 'COMPANHIAVOLTA']),
    dataSaidaVolta: getRowValue(row, ['DATA_SAIDA_VOLTA', 'SAIDA_VOLTA', 'DATASAIDAVOLTA']),
    vooVolta: getRowValue(row, ['VOO_VOLTA', 'VOOVOLTA']),
    origemVolta: getRowValue(row, ['ORIGEM_VOLTA', 'ORIGEMVOLTA']),
    destinoVolta: getRowValue(row, ['DESTINO_VOLTA', 'DESTINOVOLTA']),
    horarioVolta: getRowValue(row, ['HORARIO_VOLTA', 'HORARIOVOLTA', 'HORA_VOLTA']),
    horarioChegadaVolta: getRowValue(row, ['HORARIO_CHEGADA_VOLTA', 'CHEGADA_VOLTA', 'HORARIOCHEGADAVOLTA']),
    dataChegadaVolta: getRowValue(row, ['DATA_CHEGADA_VOLTA', 'CHEGADA_DATA_VOLTA', 'DATACHEGADAVOLTA']),
  };
}

async function importAereosFromCsv({ file, dryRun }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Arquivo CSV nao encontrado: ${file}`);
  }

  const csvContent = fs.readFileSync(file, 'utf8');
  const rows = parseCsvFile(csvContent);
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');
  const aereosCollection = database.collection('aereos');

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const row of rows) {
    const payload = mapCsvRowToAereo(row);

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
      normalizedPayload = normalizeAereoPayload(payload);
    } catch (error) {
      skippedCount += 1;
      console.warn(`Linha ignorada para ID ${payload.id_magalu}: ${error.message}`);
      continue;
    }

    const aereoPayload = createAereo({ userId: String(existingUser._id), ...normalizedPayload });
    const existingAereo = await aereosCollection.findOne({ userId: existingUser._id });

    if (dryRun) {
      if (existingAereo) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }
      continue;
    }

    await aereosCollection.updateOne(
      { userId: existingUser._id },
      {
        $set: {
          ...normalizedPayload,
          updatedAt: aereoPayload.updatedAt,
        },
        $setOnInsert: {
          userId: aereoPayload.userId,
          createdAt: aereoPayload.createdAt,
        },
      },
      { upsert: true }
    );

    await invalidateUserLogisticaCaches(existingUser.id_magalu, String(existingUser._id));

    if (existingAereo) {
      updatedCount += 1;
    } else {
      insertedCount += 1;
    }
  }

  console.log(`Importacao concluida. Inseridos: ${insertedCount}. Atualizados: ${updatedCount}. Nao encontrados: ${notFoundCount}. Ignorados: ${skippedCount}.`);
}

const options = parseArgs(process.argv.slice(2), DEFAULT_CSV_FILE);

importAereosFromCsv(options)
  .catch((error) => {
    console.error('Falha ao importar aereos do CSV:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });