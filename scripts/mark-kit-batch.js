/**
 * Marca kit=true em usuarios ate atingir o total desejado.
 *
 * Uso:
 *   node scripts/mark-kit-batch.js              (dry run — mostra o que faria)
 *   node scripts/mark-kit-batch.js --apply      (aplica de fato)
 */

require('dotenv').config();

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');

const TARGET_TOTAL = 2396;

async function main() {
  const apply = process.argv.includes('--apply');
  const db = await connectToMongoDB();
  const users = db.collection('users');

  const alreadyWithKit = await users.countDocuments({ kit: true });
  const totalUsers = await users.countDocuments();
  const remaining = TARGET_TOTAL - alreadyWithKit;

  console.log(`Total de usuarios no banco: ${totalUsers}`);
  console.log(`Usuarios com kit=true:      ${alreadyWithKit}`);
  console.log(`Meta:                       ${TARGET_TOTAL}`);
  console.log(`Faltam marcar:              ${remaining}`);
  console.log('');

  if (remaining <= 0) {
    console.log('Meta ja atingida ou ultrapassada. Nada a fazer.');
    await closeMongoDBConnection();
    return;
  }

  const withoutKit = await users.countDocuments({ $or: [{ kit: { $ne: true } }, { kit: { $exists: false } }] });
  console.log(`Usuarios sem kit:           ${withoutKit}`);

  if (withoutKit < remaining) {
    console.log(`AVISO: So existem ${withoutKit} usuarios sem kit, mas precisa de ${remaining}. Vai marcar todos os ${withoutKit} disponiveis.`);
  }

  const toMark = Math.min(remaining, withoutKit);

  if (!apply) {
    console.log(`\n[DRY RUN] Marcaria ${toMark} usuarios com kit=true.`);
    console.log('Para aplicar, rode: node scripts/mark-kit-batch.js --apply');
    await closeMongoDBConnection();
    return;
  }

  // Pega os IDs dos usuarios sem kit, ordenados pelo _id (mais antigos primeiro)
  const userIds = await users.find(
    { $or: [{ kit: { $ne: true } }, { kit: { $exists: false } }] },
    { projection: { _id: 1 } }
  )
    .sort({ _id: 1 })
    .limit(toMark)
    .toArray();

  const ids = userIds.map((u) => u._id);

  const result = await users.updateMany(
    { _id: { $in: ids } },
    { $set: { kit: true } }
  );

  const finalCount = await users.countDocuments({ kit: true });

  console.log(`\nAtualizado: ${result.modifiedCount} usuarios marcados com kit=true.`);
  console.log(`Total atual com kit=true: ${finalCount}`);

  await closeMongoDBConnection();
}

main().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
