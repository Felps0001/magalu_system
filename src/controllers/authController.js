const { getUsersCollection } = require('../config/collections');

async function loginHandler(req, res) {
  try {
    const { id_magalu } = req.body;

    if (!id_magalu) {
      res.status(400).json({ error: 'O campo id_magalu e obrigatorio.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.aggregate([
      {
        $match: {
          id_magalu,
        },
      },
      {
        $lookup: {
          from: 'checkins',
          localField: '_id',
          foreignField: 'userId',
          as: 'checkins',
        },
      },
      {
        $addFields: {
          pontos: { $sum: '$checkins.pontos' },
          tempo: { $sum: '$checkins.tempo' },
          totalCheckins: { $size: '$checkins' },
        },
      },
      {
        $lookup: {
          from: 'estandes',
          localField: 'checkins.estandeId',
          foreignField: '_id',
          as: 'estandesVisitados',
        },
      },
      {
        $limit: 1,
      },
    ]).next();

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado para o id_magalu informado.' });
      return;
    }

    res.json({
      accessGranted: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  loginHandler,
};