const { getUsersCollection } = require('../config/collections');
const { buildCacheKey, getOrSetJsonCache } = require('../services/cache');
const { canPublishToFeed } = require('../services/feedAccess');
const { verifyPassword } = require('../services/password');
const { buildUserAccessPipeline } = require('../services/userAccessPipeline');

const AUTH_LOGIN_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_AUTH_SECONDS || 30);

async function loginHandler(req, res) {
  try {
    const { id_magalu } = req.body;
    const senha = typeof req.body.senha === 'string' ? req.body.senha.trim() : '';

    if (!id_magalu) {
      res.status(400).json({ error: 'O campo id_magalu e obrigatorio.' });
      return;
    }

    if (!senha) {
      res.status(400).json({ error: 'Informe sua senha para entrar.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const loginUser = await usersCollection.findOne(
      { id_magalu },
      {
        projection: {
          _id: 1,
          id_magalu: 1,
          firstAccessCompleted: 1,
          passwordHash: 1,
        },
      }
    );

    if (!loginUser) {
      res.status(404).json({ error: 'Usuario nao encontrado para o id_magalu informado.' });
      return;
    }

    if (loginUser.firstAccessCompleted !== true || !loginUser.passwordHash) {
      res.status(403).json({ error: 'Seu cadastro ainda nao possui senha. Use o primeiro acesso para concluir.' });
      return;
    }

    if (!verifyPassword(senha, loginUser.passwordHash)) {
      res.status(401).json({ error: 'Senha invalida.' });
      return;
    }

    const user = await getOrSetJsonCache({
      key: buildCacheKey(['auth', 'login', id_magalu]),
      ttlSeconds: AUTH_LOGIN_CACHE_TTL_SECONDS,
      loader: () => usersCollection.aggregate(
        buildUserAccessPipeline(
          {
            id_magalu,
          },
          { limitOne: true }
        )
      ).next(),
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado para o id_magalu informado.' });
      return;
    }

    res.json({
      accessGranted: true,
      user: {
        ...user,
        feedCanPublish: canPublishToFeed(user),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function startFirstAccessHandler(req, res) {
  try {
    const { id_magalu } = req.body;

    if (!id_magalu) {
      res.status(400).json({ error: 'O campo id_magalu e obrigatorio.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.aggregate(
      buildUserAccessPipeline(
        {
          id_magalu,
        },
        { limitOne: true }
      )
    ).next();

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado para o id_magalu informado.' });
      return;
    }

    if (user.firstAccessCompleted === true && user.passwordHash) {
      res.status(409).json({ error: 'Primeiro acesso ja concluido para este usuario.' });
      return;
    }

    res.json({
      accessGranted: true,
      user: {
        ...user,
        passwordHash: undefined,
        feedCanPublish: canPublishToFeed(user),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  loginHandler,
  startFirstAccessHandler,
};