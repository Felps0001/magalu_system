const { ObjectId } = require('mongodb');
const QRCode = require('qrcode');

const { getUsersCollection } = require('../config/collections');
const { buildUserQrData, createUser, createUserQrPayload } = require('../models/user');
const { buildCacheKey, deleteCacheByPrefix, deleteCacheKeys, getOrSetJsonCache } = require('../services/cache');

const USERS_CACHE_KEY = buildCacheKey(['users', 'list']);
const USERS_AGENDA_CACHE_KEY = buildCacheKey(['users', 'agenda']);
const USERS_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USERS_SECONDS || 30);
const USERS_AGENDA_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_AGENDA_SECONDS || 60);
const USER_KIT_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USER_KIT_SECONDS || 45);
const USER_QRCODE_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USER_QRCODE_SECONDS || 300);

function buildUserAccessPipeline(matchStage) {
  return [
    {
      $match: matchStage,
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
  ];
}

async function findUserWithAccessData(usersCollection, matchStage) {
  return usersCollection.aggregate(buildUserAccessPipeline(matchStage)).next();
}

function normalizeEditableUserFields(payload = {}) {
  const editableFields = ['nome', 'regiao', 'cidade', 'loja', 'cargo', 'turma', 'hospedagem', 'aereo'];
  const normalizedPayload = {};

  editableFields.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(payload, fieldName)) {
      normalizedPayload[fieldName] = typeof payload[fieldName] === 'string'
        ? payload[fieldName].trim()
        : '';
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, 'transfer')) {
    const { transfer } = payload;

    normalizedPayload.transfer = transfer === true || transfer === 'true' || transfer === '1' || transfer === 1;
  }

  return normalizedPayload;
}

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

function buildUserKitCacheKey(userId) {
  return buildCacheKey(['users', userId, 'kit']);
}

function buildUserQrCodeCacheKey(userId) {
  return buildCacheKey(['users', userId, 'qrcode']);
}

async function invalidateUserCaches({ userId, idMagalu }) {
  await deleteCacheKeys([
    USERS_CACHE_KEY,
    USERS_AGENDA_CACHE_KEY,
    buildUserKitCacheKey(userId),
    buildUserQrCodeCacheKey(userId),
    buildCacheKey(['auth', 'login', idMagalu]),
  ]);
  await deleteCacheByPrefix('feed:');
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
    await invalidateUserCaches({
      userId: String(userWithQrCode._id),
      idMagalu: userWithQrCode.id_magalu,
    });

    res.status(201).json(userWithQrCode);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Ja existe um usuario com este id_magalu.' });
      return;
    }

    res.status(500).json({ error: error.message });
  }
}

async function updateUserProfileHandler(req, res) {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O id do usuario informado e invalido.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const editableFields = normalizeEditableUserFields(req.body);
    const qrCodeGeneratedAt = new Date().toISOString();
    const updatedUser = {
      ...existingUser,
      ...editableFields,
      firstAccessCompleted: true,
    };

    await usersCollection.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          ...editableFields,
          firstAccessCompleted: true,
          qrCodeGeneratedAt,
          qrCodePayload: createUserQrPayload(updatedUser, qrCodeGeneratedAt),
        },
      }
    );

    const refreshedUser = await findUserWithAccessData(usersCollection, { _id: existingUser._id });
    await invalidateUserCaches({
      userId,
      idMagalu: existingUser.id_magalu,
    });

    res.json(refreshedUser);
  } catch (error) {
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
    const qrCodeResponse = await getOrSetJsonCache({
      key: buildUserQrCodeCacheKey(userId),
      ttlSeconds: USER_QRCODE_CACHE_TTL_SECONDS,
      loader: async () => {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          return null;
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

        return {
          qrCodeData: buildUserQrData(userWithQrCode, userWithQrCode.qrCodeGeneratedAt),
          qrCodeGeneratedAt: userWithQrCode.qrCodeGeneratedAt,
          qrCodePayload: userWithQrCode.qrCodePayload,
          qrCodeSvg,
          userId: String(userWithQrCode._id),
        };
      },
    });

    if (!qrCodeResponse) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    res.json(qrCodeResponse);
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
    const user = await getOrSetJsonCache({
      key: buildUserKitCacheKey(userId),
      ttlSeconds: USER_KIT_CACHE_TTL_SECONDS,
      loader: () => usersCollection.findOne(
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
      ),
    });

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
    const users = await getOrSetJsonCache({
      key: USERS_CACHE_KEY,
      ttlSeconds: USERS_CACHE_TTL_SECONDS,
      loader: async () => {
        const usersCollection = await getUsersCollection();

        return usersCollection.aggregate([
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
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listAgendaByTurmaHandler(req, res) {
  try {
    const agenda = await getOrSetJsonCache({
      key: USERS_AGENDA_CACHE_KEY,
      ttlSeconds: USERS_AGENDA_CACHE_TTL_SECONDS,
      loader: async () => {
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

        return users.reduce((groups, user) => {
          const turmaName = user.turma || 'Sem turma';

          if (!groups[turmaName]) {
            groups[turmaName] = [];
          }

          groups[turmaName].push(user);
          return groups;
        }, initialAgenda);
      },
    });

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
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const qrCodeGeneratedAt = new Date().toISOString();
    const updatedUser = {
      ...existingUser,
      kit: true,
    };
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          kit: true,
          qrCodeGeneratedAt,
          qrCodePayload: createUserQrPayload(updatedUser, qrCodeGeneratedAt),
        },
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    await invalidateUserCaches({
      userId,
      idMagalu: existingUser.id_magalu,
    });

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
  updateUserProfileHandler,
};