const { getCheckinsCollection } = require('../config/collections');
const { createCheckin } = require('../models/checkin');

async function createCheckinHandler(req, res) {
  try {
    const checkinsCollection = await getCheckinsCollection();
    const checkin = createCheckin(req.body);
    const result = await checkinsCollection.insertOne(checkin);

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
    const checkinsCollection = await getCheckinsCollection();
    const checkins = await checkinsCollection.aggregate([
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

    res.json(checkins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createCheckinHandler,
  listCheckinsHandler,
};