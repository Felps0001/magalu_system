/**
 * Remove registros duplicados do banco de dados.
 *
 * - Checkins com mesmo userId + estandeId: mantem o mais antigo (checkinEm).
 * - Users com mesmo id_magalu: mantem o mais antigo (_id).
 *
 * Uso:
 *   node scripts/cleanup-duplicates.js            (apenas listar — dry run)
 *   node scripts/cleanup-duplicates.js --apply     (remover de fato)
 */

require('dotenv').config();

const { connectToMongoDB, closeMongoDBConnection } = require('../src/config/mongodb');

async function getDatabase() {
  return connectToMongoDB();
}

async function findAndCleanDuplicateCheckins(db, apply) {
  const checkins = db.collection('checkins');

  const duplicates = await checkins.aggregate([
    {
      $group: {
        _id: { userId: '$userId', estandeId: '$estandeId' },
        count: { $sum: 1 },
        docs: { $push: { _id: '$_id', checkinEm: '$checkinEm' } },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  if (duplicates.length === 0) {
    console.log('[checkins] Nenhum duplicado encontrado.');
    return 0;
  }

  console.log(`[checkins] ${duplicates.length} grupo(s) de duplicados encontrados:`);

  let totalRemoved = 0;

  for (const group of duplicates) {
    const sorted = group.docs.sort((a, b) => {
      const dateA = a.checkinEm ? new Date(a.checkinEm).getTime() : 0;
      const dateB = b.checkinEm ? new Date(b.checkinEm).getTime() : 0;
      return dateA - dateB;
    });

    const keep = sorted[0];
    const toRemove = sorted.slice(1);
    const idsToRemove = toRemove.map((d) => d._id);

    console.log(`  userId=${group._id.userId} estandeId=${group._id.estandeId} — ${group.count} registros, mantendo _id=${keep._id}, removendo ${idsToRemove.length}`);

    if (apply) {
      const result = await checkins.deleteMany({ _id: { $in: idsToRemove } });
      totalRemoved += result.deletedCount;
    } else {
      totalRemoved += idsToRemove.length;
    }
  }

  return totalRemoved;
}

async function findAndCleanDuplicateUsers(db, apply) {
  const users = db.collection('users');

  const duplicates = await users.aggregate([
    {
      $group: {
        _id: '$id_magalu',
        count: { $sum: 1 },
        docs: { $push: { _id: '$_id', nome: '$nome' } },
      },
    },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ]).toArray();

  if (duplicates.length === 0) {
    console.log('[users] Nenhum duplicado encontrado.');
    return 0;
  }

  console.log(`[users] ${duplicates.length} grupo(s) de duplicados encontrados:`);

  let totalRemoved = 0;

  for (const group of duplicates) {
    const sorted = group.docs.sort((a, b) => {
      const tsA = a._id.getTimestamp().getTime();
      const tsB = b._id.getTimestamp().getTime();
      return tsA - tsB;
    });

    const keep = sorted[0];
    const toRemove = sorted.slice(1);
    const idsToRemove = toRemove.map((d) => d._id);

    console.log(`  id_magalu=${group._id} — ${group.count} registros, mantendo _id=${keep._id} (${keep.nome || 'sem nome'}), removendo ${idsToRemove.length}`);

    if (apply) {
      const result = await users.deleteMany({ _id: { $in: idsToRemove } });
      totalRemoved += result.deletedCount;
    } else {
      totalRemoved += idsToRemove.length;
    }
  }

  return totalRemoved;
}

async function main() {
  const apply = process.argv.includes('--apply');

  console.log(apply
    ? '=== MODO APLICAR — registros serao removidos ==='
    : '=== MODO DRY RUN — nenhum registro sera removido (use --apply para remover) ===');
  console.log('');

  const db = await getDatabase();

  const removedCheckins = await findAndCleanDuplicateCheckins(db, apply);
  console.log('');
  const removedUsers = await findAndCleanDuplicateUsers(db, apply);

  console.log('');
  console.log('--- Resumo ---');
  console.log(`Checkins duplicados ${apply ? 'removidos' : 'encontrados'}: ${removedCheckins}`);
  console.log(`Users duplicados ${apply ? 'removidos' : 'encontrados'}: ${removedUsers}`);

  if (!apply && (removedCheckins > 0 || removedUsers > 0)) {
    console.log('\nPara aplicar, rode: node scripts/cleanup-duplicates.js --apply');
  }

  await closeMongoDBConnection();
}

main().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
