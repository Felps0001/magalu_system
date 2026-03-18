require('dotenv').config();

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');

async function migrateUserKitExtraFields() {
  const database = await connectToMongoDB();
  const usersCollection = database.collection('users');

  const resultKitExtra = await usersCollection.updateMany(
    {
      $or: [
        { kitExtra: { $exists: false } },
        { kitExtra: null },
      ],
    },
    {
      $set: {
        kitExtra: false,
      },
    }
  );

  const resultKitExtraRetirada = await usersCollection.updateMany(
    {
      $or: [
        { kitExtraRetirada: { $exists: false } },
        { kitExtraRetirada: null },
        { kitExtra: { $ne: true } },
      ],
    },
    {
      $set: {
        kitExtraRetirada: false,
      },
    }
  );

  return {
    kitExtraMatched: resultKitExtra.matchedCount,
    kitExtraModified: resultKitExtra.modifiedCount,
    kitExtraRetiradaMatched: resultKitExtraRetirada.matchedCount,
    kitExtraRetiradaModified: resultKitExtraRetirada.modifiedCount,
  };
}

(async () => {
  try {
    const result = await migrateUserKitExtraFields();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
})();