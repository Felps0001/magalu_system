const { ObjectId } = require('mongodb');
const QRCode = require('qrcode');

const { getAereosCollection, getRotasCollection, getUsersCollection } = require('../config/collections');
const { createAereo, normalizeAereoPayload } = require('../models/aereo');
const { createRota, normalizeRotaPayload } = require('../models/rota');
const { buildUserQrData, createUser, createUserQrPayload, normalizeUserLegacyFields } = require('../models/user');
const { buildCacheKey, deleteCacheByPrefix, deleteCacheKeys, getOrSetJsonCache } = require('../services/cache');
const { buildUserAccessPipeline, buildUserSummaryPipeline } = require('../services/userAccessPipeline');

const USERS_CACHE_KEY = buildCacheKey(['users', 'list']);
const USERS_AGENDA_CACHE_KEY = buildCacheKey(['users', 'agenda']);
const USERS_RANKING_CACHE_KEY = buildCacheKey(['users', 'ranking']);
const USERS_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USERS_SECONDS || 30);
const USERS_AGENDA_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_AGENDA_SECONDS || 60);
const USERS_RANKING_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USERS_RANKING_SECONDS || 20);
const USER_KIT_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USER_KIT_SECONDS || 45);
const USER_QRCODE_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USER_QRCODE_SECONDS || 300);
const USER_DETAILS_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_USER_DETAILS_SECONDS || 20);

async function findUserWithAccessData(usersCollection, matchStage) {
  return usersCollection.aggregate(buildUserAccessPipeline(matchStage, { limitOne: true })).next();
}

function normalizeUserResponse(user) {
  return normalizeUserLegacyFields(user);
}

function normalizeUserResponseList(users = []) {
  return users.map((user) => normalizeUserResponse(user));
}

function parsePositiveInteger(value) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function compareUsersByRanking(leftUser = {}, rightUser = {}) {
  const pointsDifference = Number(rightUser.pontos || 0) - Number(leftUser.pontos || 0);

  if (pointsDifference !== 0) {
    return pointsDifference;
  }

  const checkinsDifference = Number(rightUser.totalCheckins || 0) - Number(leftUser.totalCheckins || 0);

  if (checkinsDifference !== 0) {
    return checkinsDifference;
  }

  const timeDifference = Number(leftUser.tempo || 0) - Number(rightUser.tempo || 0);

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return String(leftUser.nome || '').localeCompare(String(rightUser.nome || ''), 'pt-BR');
}

function normalizeEditableUserFields(payload = {}) {
  const normalizedPayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'nome')) {
    normalizedPayload.nome = typeof payload.nome === 'string' ? payload.nome.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'cargo')) {
    normalizedPayload.cargo = typeof payload.cargo === 'string' ? payload.cargo.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'regional') || Object.prototype.hasOwnProperty.call(payload, 'regiao')) {
    const regionalValue = Object.prototype.hasOwnProperty.call(payload, 'regional')
      ? payload.regional
      : payload.regiao;

    normalizedPayload.regional = typeof regionalValue === 'string' ? regionalValue.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'filial') || Object.prototype.hasOwnProperty.call(payload, 'loja')) {
    const filialValue = Object.prototype.hasOwnProperty.call(payload, 'filial')
      ? payload.filial
      : payload.loja;

    normalizedPayload.filial = typeof filialValue === 'string' ? filialValue.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'kitExtra')) {
    const { kitExtra } = payload;

    normalizedPayload.kitExtra = kitExtra === true || kitExtra === 'true' || kitExtra === '1' || kitExtra === 1;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'kitExtraRetirada')) {
    const { kitExtraRetirada } = payload;

    normalizedPayload.kitExtraRetirada = kitExtraRetirada === true || kitExtraRetirada === 'true' || kitExtraRetirada === '1' || kitExtraRetirada === 1;
  }

  if (normalizedPayload.kitExtra === false) {
    normalizedPayload.kitExtraRetirada = false;
  }

  if (!Object.prototype.hasOwnProperty.call(normalizedPayload, 'kitExtra') && normalizedPayload.kitExtraRetirada === true) {
    normalizedPayload.kitExtra = true;
  }

  return normalizedPayload;
}

function buildUserQrMetadata(user, generatedAt = new Date().toISOString()) {
  if (!user || !user.id_magalu) {
    return null;
  }

  return {
    qrCodeGeneratedAt: generatedAt,
    qrCodePayload: createUserQrPayload(user, generatedAt),
  };
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

async function findExistingUserOrRespond(res, userId) {
  if (!ObjectId.isValid(userId)) {
    res.status(400).json({ error: 'O id do usuario informado e invalido.' });
    return null;
  }

  const usersCollection = await getUsersCollection();
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    res.status(404).json({ error: 'Usuario nao encontrado.' });
    return null;
  }

  return {
    usersCollection,
    user,
  };
}

function buildUserKitCacheKey(userId) {
  return buildCacheKey(['users', userId, 'kit']);
}

function buildUserQrCodeCacheKey(userId) {
  return buildCacheKey(['users', userId, 'qrcode']);
}

function buildUserDetailsCacheKey(userId) {
  return buildCacheKey(['users', userId, 'details']);
}

async function invalidateUserCaches({ userId, idMagalu }) {
  await deleteCacheKeys([
    USERS_CACHE_KEY,
    USERS_AGENDA_CACHE_KEY,
    USERS_RANKING_CACHE_KEY,
    buildUserDetailsCacheKey(userId),
    buildUserKitCacheKey(userId),
    buildUserQrCodeCacheKey(userId),
    buildCacheKey(['auth', 'login', idMagalu]),
  ]);
  await deleteCacheByPrefix('feed:');
}

async function createUserHandler(req, res) {
  try {
    const usersCollection = await getUsersCollection();
    const idMagalu = typeof req.body.id_magalu === 'string'
      ? req.body.id_magalu.trim()
      : req.body.id_magalu
        ? String(req.body.id_magalu).trim()
        : '';
    const existingUser = idMagalu
      ? await usersCollection.findOne({ id_magalu: idMagalu })
      : null;

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
    const qrMetadata = buildUserQrMetadata(user, qrCodeGeneratedAt);
    const userWithQrCode = {
      ...user,
      ...(qrMetadata || {}),
    };

    await usersCollection.insertOne(userWithQrCode);
    await invalidateUserCaches({
      userId: String(userWithQrCode._id),
      idMagalu: userWithQrCode.id_magalu,
    });

    res.status(201).json(normalizeUserResponse(userWithQrCode));
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
    const qrMetadata = buildUserQrMetadata(updatedUser, qrCodeGeneratedAt);
    const setPayload = {
      ...editableFields,
      firstAccessCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    const unsetPayload = {
      aereo: '',
      regiao: '',
      loja: '',
      turma: '',
      cidade: '',
      transfer: '',
      hospedagem: '',
    };

    if (qrMetadata) {
      Object.assign(setPayload, qrMetadata);
    } else {
      unsetPayload.qrCodeGeneratedAt = '';
      unsetPayload.qrCodePayload = '';
    }

    await usersCollection.updateOne(
      { _id: existingUser._id },
      {
        $set: setPayload,
        $unset: unsetPayload,
      }
    );

    const refreshedUser = await findUserWithAccessData(usersCollection, { _id: existingUser._id });
    await invalidateUserCaches({
      userId,
      idMagalu: existingUser.id_magalu,
    });

    res.json(normalizeUserResponse(refreshedUser));
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
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    if (!existingUser.id_magalu) {
      res.status(400).json({ error: 'Usuario sem id_magalu nao possui QR Code disponivel.' });
      return;
    }

    const qrCodeResponse = await getOrSetJsonCache({
      key: buildUserQrCodeCacheKey(userId),
      ttlSeconds: USER_QRCODE_CACHE_TTL_SECONDS,
      loader: async () => {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user || !user.id_magalu) {
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

async function getUserByIdHandler(req, res) {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O id do usuario informado e invalido.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await getOrSetJsonCache({
      key: buildUserDetailsCacheKey(userId),
      ttlSeconds: USER_DETAILS_CACHE_TTL_SECONDS,
      loader: () => findUserWithAccessData(usersCollection, { _id: new ObjectId(userId) }),
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    res.json(normalizeUserResponse(user));
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
            filial: 1,
            regional: 1,
            cargo: 1,
            kit: 1,
            kitExtra: 1,
            kitExtraRetirada: 1,
          },
        }
      ),
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const normalizedUser = normalizeUserResponse(user);

    res.json({
      userId: String(normalizedUser._id),
      nome: normalizedUser.nome || '',
      id_magalu: normalizedUser.id_magalu || '',
      filial: normalizedUser.filial,
      regional: normalizedUser.regional,
      cargo: normalizedUser.cargo || '',
      kit: Boolean(normalizedUser.kit),
      kitExtra: Boolean(normalizedUser.kitExtra),
      kitExtraRetirada: Boolean(normalizedUser.kitExtra) && Boolean(normalizedUser.kitExtraRetirada),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserRotaHandler(req, res) {
  try {
    const { userId } = req.params;
    const existingUser = await findExistingUserOrRespond(res, userId);

    if (!existingUser) {
      return;
    }

    const rotasCollection = await getRotasCollection();
    const rota = await rotasCollection.findOne({ userId: existingUser.user._id });

    if (!rota) {
      res.status(404).json({ error: 'Rota nao encontrada para este usuario.' });
      return;
    }

    res.json(rota);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function upsertUserRotaHandler(req, res) {
  try {
    const { userId } = req.params;
    const existingUser = await findExistingUserOrRespond(res, userId);

    if (!existingUser) {
      return;
    }

    const normalizedPayload = normalizeRotaPayload(req.body);
    const rotasCollection = await getRotasCollection();
    const existingRota = await rotasCollection.findOne({ userId: existingUser.user._id });
    const rotaPayload = createRota({ userId, ...normalizedPayload });

    await rotasCollection.updateOne(
      { userId: existingUser.user._id },
      {
        $set: {
          ...normalizedPayload,
          updatedAt: rotaPayload.updatedAt,
        },
        $setOnInsert: {
          userId: rotaPayload.userId,
          createdAt: rotaPayload.createdAt,
        },
      },
      { upsert: true }
    );

    await invalidateUserCaches({
      userId,
      idMagalu: existingUser.user.id_magalu,
    });

    const refreshedUser = await findUserWithAccessData(existingUser.usersCollection, { _id: existingUser.user._id });
    res.status(existingRota ? 200 : 201).json({
      message: existingRota ? 'Rota atualizada com sucesso.' : 'Rota criada com sucesso.',
      rota: refreshedUser ? refreshedUser.rota : null,
      user: normalizeUserResponse(refreshedUser),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserAereoHandler(req, res) {
  try {
    const { userId } = req.params;
    const existingUser = await findExistingUserOrRespond(res, userId);

    if (!existingUser) {
      return;
    }

    const aereosCollection = await getAereosCollection();
    const aereo = await aereosCollection.findOne({ userId: existingUser.user._id });

    if (!aereo) {
      res.status(404).json({ error: 'Aereo nao encontrado para este usuario.' });
      return;
    }

    res.json(aereo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function upsertUserAereoHandler(req, res) {
  try {
    const { userId } = req.params;
    const existingUser = await findExistingUserOrRespond(res, userId);

    if (!existingUser) {
      return;
    }

    const normalizedPayload = normalizeAereoPayload(req.body);
    const aereosCollection = await getAereosCollection();
    const existingAereo = await aereosCollection.findOne({ userId: existingUser.user._id });
    const aereoPayload = createAereo({ userId, ...normalizedPayload });

    await aereosCollection.updateOne(
      { userId: existingUser.user._id },
      {
        $set: {
          ...normalizedPayload,
          updatedAt: aereoPayload.updatedAt,
        },
        $setOnInsert: {
          userId: aereoPayload.userId,
          createdAt: aereoPayload.createdAt,
        },
      },
      { upsert: true }
    );

    await invalidateUserCaches({
      userId,
      idMagalu: existingUser.user.id_magalu,
    });

    const refreshedUser = await findUserWithAccessData(existingUser.usersCollection, { _id: existingUser.user._id });
    res.status(existingAereo ? 200 : 201).json({
      message: existingAereo ? 'Aereo atualizado com sucesso.' : 'Aereo criado com sucesso.',
      aereo: refreshedUser ? refreshedUser.aereoDetalhes : null,
      user: normalizeUserResponse(refreshedUser),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listUsersHandler(req, res) {
  try {
    const requestedView = typeof req.query.view === 'string'
      ? req.query.view.trim().toLowerCase()
      : '';

    if (requestedView === 'ranking') {
      const rankingLimit = parsePositiveInteger(req.query.limit);
      const rankingUsers = await getOrSetJsonCache({
        key: rankingLimit
          ? buildCacheKey(['users', 'ranking', String(rankingLimit)])
          : USERS_RANKING_CACHE_KEY,
        ttlSeconds: USERS_RANKING_CACHE_TTL_SECONDS,
        loader: async () => {
          const usersCollection = await getUsersCollection();

          return usersCollection.aggregate(
            buildUserSummaryPipeline({}, {
              sortRanking: true,
              limit: rankingLimit,
            })
          ).toArray();
        },
      });

      const normalizedRankingUsers = normalizeUserResponseList(rankingUsers)
        .map((user, index) => ({
          ...user,
          rankingPosition: index + 1,
        }));

      res.json(normalizedRankingUsers);
      return;
    }

    const users = await getOrSetJsonCache({
      key: USERS_CACHE_KEY,
      ttlSeconds: USERS_CACHE_TTL_SECONDS,
      loader: async () => {
        const usersCollection = await getUsersCollection();

        return usersCollection.aggregate(buildUserAccessPipeline()).toArray();
      },
    });

    const normalizedUsers = normalizeUserResponseList(users);

    res.json(normalizedUsers);
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
              regional: 1,
              regiao: 1,
              cargo: 1,
              filial: 1,
              loja: 1,
            },
          }
        ).toArray();

        const normalizedUsers = normalizeUserResponseList(users).sort((leftUser, rightUser) => {
          const regionalComparison = leftUser.regional.localeCompare(rightUser.regional, 'pt-BR');

          if (regionalComparison !== 0) {
            return regionalComparison;
          }

          return (leftUser.nome || '').localeCompare(rightUser.nome || '', 'pt-BR');
        });

        const initialAgenda = {
          'Sem regional': [],
        };

        return normalizedUsers.reduce((groups, user) => {
          const turmaName = user.regional || 'Sem regional';

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
    let action = 'none';

    if (existingUser.kit !== true) {
      action = 'kit';
    } else if (existingUser.kitExtra === true && existingUser.kitExtraRetirada !== true) {
      action = 'kitExtra';
    }

    const updatedUser = {
      ...existingUser,
      kit: existingUser.kit === true || action === 'kit',
      kitExtraRetirada: existingUser.kitExtra === true
        ? (existingUser.kitExtraRetirada === true || action === 'kitExtra')
        : false,
    };
    const qrMetadata = buildUserQrMetadata(updatedUser, qrCodeGeneratedAt);
    const setPayload = {
      kit: updatedUser.kit,
      kitExtraRetirada: updatedUser.kitExtraRetirada,
    };
    const unsetPayload = {};

    if (qrMetadata) {
      Object.assign(setPayload, qrMetadata);
    } else {
      unsetPayload.qrCodeGeneratedAt = '';
      unsetPayload.qrCodePayload = '';
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: setPayload,
        ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {}),
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

    res.json({
      success: true,
      action,
      kit: updatedUser.kit,
      kitExtra: Boolean(updatedUser.kitExtra),
      kitExtraRetirada: Boolean(updatedUser.kitExtraRetirada),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createUserHandler,
  getUserByIdHandler,
  getUserAereoHandler,
  getUserKitStatusHandler,
  getUserQrCodeHandler,
  getUserRotaHandler,
  listUsersHandler,
  listAgendaByTurmaHandler,
  marcarKitHandler,
  upsertUserAereoHandler,
  upsertUserRotaHandler,
  updateUserProfileHandler,
};