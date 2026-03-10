const { getUsersCollection } = require('../config/collections');
const { createUser } = require('../models/user');

async function createUserHandler(req, res) {
  try {
    const usersCollection = await getUsersCollection();
    const existingUser = await usersCollection.findOne({
      id_magalu: req.body.id_magalu,
    });

    if (existingUser) {
      res.status(409).json({ error: 'Ja existe um usuario com este id_magalu.' });
      return;
    }

    const user = createUser(req.body);
    const result = await usersCollection.insertOne(user);

    res.status(201).json({
      _id: result.insertedId,
      ...user,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Ja existe um usuario com este id_magalu.' });
      return;
    }

    res.status(500).json({ error: error.message });
  }
}

async function listUsersHandler(req, res) {
  try {
    const usersCollection = await getUsersCollection();
    const users = await usersCollection.aggregate([
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
    ]).toArray();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listAgendaByTurmaHandler(req, res) {
  try {
    const usersCollection = await getUsersCollection();
    const users = await usersCollection.find(
      {},
      {
        projection: {
          nome: 1,
          turma: 1,
          cargo: 1,
          loja: 1,
          regiao: 1,
        },
      }
    ).sort({ turma: 1, nome: 1 }).toArray();

    const initialAgenda = {
      'Turma A': [],
      'Turma B': [],
      'Turma C': [],
      'Sem turma': [],
    };

    const agenda = users.reduce((groups, user) => {
      const turmaName = user.turma || 'Sem turma';

      if (!groups[turmaName]) {
        groups[turmaName] = [];
      }

      groups[turmaName].push(user);
      return groups;
    }, initialAgenda);

    res.json(agenda);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createUserHandler,
  listUsersHandler,
  listAgendaByTurmaHandler,
};