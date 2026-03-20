require('dotenv').config();

const { closeMongoDBConnection, connectToMongoDB } = require('../src/config/mongodb');

async function migrateUsersSchema() {
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');

  const regionalRenameResult = await usersCollection.updateMany(
    {
      regional: { $exists: false },
      regiao: { $exists: true },
    },
    {
      $rename: {
        regiao: 'regional',
      },
    }
  );

  const filialRenameResult = await usersCollection.updateMany(
    {
      filial: { $exists: false },
      loja: { $exists: true },
    },
    {
      $rename: {
        loja: 'filial',
      },
    }
  );

  const unsetLegacyFieldsResult = await usersCollection.updateMany(
    {},
    {
      $unset: {
        regiao: '',
        loja: '',
        turma: '',
        cidade: '',
        transfer: '',
        hospedagem: '',
      },
    }
  );

  console.log('Migracao de users concluida.');
  console.log(`regional renomeado em ${regionalRenameResult.modifiedCount} documento(s).`);
  console.log(`filial renomeado em ${filialRenameResult.modifiedCount} documento(s).`);
  console.log(`Campos legados removidos em ${unsetLegacyFieldsResult.modifiedCount} documento(s).`);
}

migrateUsersSchema()
  .catch((error) => {
    console.error('Falha na migracao de users:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoDBConnection();
  });