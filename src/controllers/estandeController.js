const { getEstandesCollection } = require('../config/collections');
const { createEstande } = require('../models/estande');

async function createEstandeHandler(req, res) {
  try {
    const estandesCollection = await getEstandesCollection();
    const estande = createEstande(req.body);
    const result = await estandesCollection.insertOne(estande);

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
    const estandesCollection = await getEstandesCollection();
    const estandes = await estandesCollection.aggregate([
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

    res.json(estandes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createEstandeHandler,
  listEstandesHandler,
};