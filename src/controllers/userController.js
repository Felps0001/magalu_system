const { ObjectId } = require('mongodb');
const QRCode = require('qrcode');

const { getUsersCollection } = require('../config/collections');
const { buildUserQrData, createUser, createUserQrPayload } = require('../models/user');

async function ensureUserQrCode(usersCollection, user) {
  if (user.qrCodePayload) {
    return user;
  }

  const qrCodeGeneratedAt = new Date().toISOString();
  const qrCodePayload = createUserQrPayload(user, qrCodeGeneratedAt);

  await usersCollection.updateOne(
    { _id: user._id },
    {
      $set: {
        qrCodeGeneratedAt,
        qrCodePayload,
      },
    }
  );

  return {
    ...user,
    qrCodeGeneratedAt,
    qrCodePayload,
  };
}

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

    const userId = new ObjectId();
    const qrCodeGeneratedAt = new Date().toISOString();
    const user = {
      _id: userId,
      ...createUser(req.body),
    };
    const userWithQrCode = {
      ...user,
      qrCodeGeneratedAt,
      qrCodePayload: createUserQrPayload(user, qrCodeGeneratedAt),
    };

    await usersCollection.insertOne(userWithQrCode);

    res.status(201).json(userWithQrCode);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Ja existe um usuario com este id_magalu.' });
      return;
    }

    res.status(500).json({ error: error.message });
  }
}

async function getUserQrCodeHandler(req, res) {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O id do usuario informado e invalido.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const userWithQrCode = await ensureUserQrCode(usersCollection, user);
    const qrCodeSvg = await QRCode.toString(userWithQrCode.qrCodePayload, {
      type: 'svg',
      width: 320,
      margin: 1,
      color: {
        dark: '#0d2142',
        light: '#ffffff',
      },
    });

    res.json({
      qrCodeData: buildUserQrData(userWithQrCode, userWithQrCode.qrCodeGeneratedAt),
      qrCodeGeneratedAt: userWithQrCode.qrCodeGeneratedAt,
      qrCodePayload: userWithQrCode.qrCodePayload,
      qrCodeSvg,
      userId: String(userWithQrCode._id),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserKitStatusHandler(req, res) {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O id do usuario informado e invalido.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          nome: 1,
          id_magalu: 1,
          loja: 1,
          turma: 1,
          cargo: 1,
          kit: 1,
        },
      }
    );

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    res.json({
      userId: String(user._id),
      nome: user.nome || '',
      id_magalu: user.id_magalu || '',
      loja: user.loja || '',
      turma: user.turma || '',
      cargo: user.cargo || '',
      kit: Boolean(user.kit),
    });
  } catch (error) {
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

async function marcarKitHandler(req, res) {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Id de usuario invalido.' });
      return;
    }
    const usersCollection = await getUsersCollection();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { kit: true } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createUserHandler,
  getUserKitStatusHandler,
  getUserQrCodeHandler,
  listUsersHandler,
  listAgendaByTurmaHandler,
  marcarKitHandler,
};