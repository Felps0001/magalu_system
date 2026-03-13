const { getEstandesCollection } = require('../config/collections');
const { createEstande } = require('../models/estande');
const { buildCacheKey, deleteCacheByPrefix, getOrSetJsonCache } = require('../services/cache');

const ESTANDES_CACHE_KEY = buildCacheKey(['estandes', 'list']);
const ESTANDES_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_ESTANDES_SECONDS || 45);

async function createEstandeHandler(req, res) {
  try {
    const estandesCollection = await getEstandesCollection();
    const estande = createEstande(req.body);
    const result = await estandesCollection.insertOne(estande);
    await deleteCacheByPrefix('estandes:');
    await deleteCacheByPrefix('users:');
    await deleteCacheByPrefix('auth:login:');

    res.status(201).json({
      _id: result.insertedId,
      ...estande,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listEstandesHandler(req, res) {
  try {
    const estandes = await getOrSetJsonCache({
      key: ESTANDES_CACHE_KEY,
      ttlSeconds: ESTANDES_CACHE_TTL_SECONDS,
      loader: async () => {
        const estandesCollection = await getEstandesCollection();

        return estandesCollection.aggregate([
          {
            $lookup: {
              from: 'checkins',
              localField: '_id',
              foreignField: 'estandeId',
              as: 'checkins',
            },
          },
          {
            $addFields: {
              totalPontos: { $sum: '$checkins.pontos' },
              totalTempo: { $sum: '$checkins.tempo' },
              totalCheckins: { $size: '$checkins' },
            },
          },
        ]).toArray();
      },
    });

    res.json(estandes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createEstandeHandler,
  listEstandesHandler,
};