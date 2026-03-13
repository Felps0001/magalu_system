const { getCheckinsCollection, getUsersCollection } = require('../config/collections');
const { createCheckin } = require('../models/checkin');
const { buildCacheKey, deleteCacheByPrefix, deleteCacheKeys, getOrSetJsonCache } = require('../services/cache');

const CHECKINS_CACHE_KEY = buildCacheKey(['checkins', 'list']);
const CHECKINS_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_CHECKINS_SECONDS || 30);

async function createCheckinHandler(req, res) {
  try {
    const checkinsCollection = await getCheckinsCollection();
    const checkin = createCheckin(req.body);
    const result = await checkinsCollection.insertOne(checkin);
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne(
      { _id: checkin.userId },
      { projection: { id_magalu: 1 } }
    );

    await deleteCacheKeys([
      CHECKINS_CACHE_KEY,
      buildCacheKey(['auth', 'login', user && user.id_magalu]),
    ]);
    await deleteCacheByPrefix('users:');
    await deleteCacheByPrefix('estandes:');

    res.status(201).json({
      _id: result.insertedId,
      ...checkin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listCheckinsHandler(req, res) {
  try {
    const checkins = await getOrSetJsonCache({
      key: CHECKINS_CACHE_KEY,
      ttlSeconds: CHECKINS_CACHE_TTL_SECONDS,
      loader: async () => {
        const checkinsCollection = await getCheckinsCollection();

        return checkinsCollection.aggregate([
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $lookup: {
              from: 'estandes',
              localField: 'estandeId',
              foreignField: '_id',
              as: 'estande',
            },
          },
          {
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: '$estande',
              preserveNullAndEmptyArrays: true,
            },
          },
        ]).toArray();
      },
    });

    res.json(checkins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createCheckinHandler,
  listCheckinsHandler,
};