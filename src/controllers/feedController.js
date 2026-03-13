const { ObjectId } = require('mongodb');

const { getFeedCollection, getUsersCollection } = require('../config/collections');
const { createFeedUploadUrl, uploadFeedImage } = require('../config/r2');
const { createFeed } = require('../models/feed');
const { buildCacheKey, deleteCacheKey, getOrSetJsonCache } = require('../services/cache');

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const FEED_CACHE_KEY = buildCacheKey(['feed', 'list']);
const FEED_CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL_FEED_SECONDS || 30);

async function resolveAuthor({ authorId, authorIdMagalu }) {
  const usersCollection = await getUsersCollection();

  if (authorId && ObjectId.isValid(authorId)) {
    return usersCollection.findOne({ _id: new ObjectId(authorId) });
  }

  if (authorIdMagalu) {
    return usersCollection.findOne({ id_magalu: authorIdMagalu });
  }

  return null;
}

async function createFeedHandler(req, res) {
  try {
    const author = await resolveAuthor({
      authorId: req.body.authorId,
      authorIdMagalu: req.body.authorIdMagalu,
    });

    if (!author) {
      res.status(404).json({ error: 'Usuario autor da publicacao nao encontrado.' });
      return;
    }

    let imagemUrl = req.body.imagemUrl;

    if (req.file) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(req.file.mimetype)) {
        res.status(400).json({ error: 'Formato de imagem nao suportado. Use JPG, PNG, WEBP ou GIF.' });
        return;
      }

      const uploadResult = await uploadFeedImage({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        authorIdMagalu: author.id_magalu,
      });

      imagemUrl = uploadResult.url;
    }

    const feedCollection = await getFeedCollection();
    const feed = createFeed({
      authorId: String(author._id),
      mensagem: req.body.mensagem,
      imagemUrl,
    });

    const result = await feedCollection.insertOne(feed);
    await deleteCacheKey(FEED_CACHE_KEY);

    res.status(201).json({
      _id: result.insertedId,
      ...feed,
      author: {
        _id: author._id,
        nome: author.nome || 'Usuario',
        id_magalu: author.id_magalu || null,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function createFeedUploadUrlHandler(req, res) {
  try {
    const author = await resolveAuthor({
      authorId: req.body.authorId,
      authorIdMagalu: req.body.authorIdMagalu,
    });

    if (!author) {
      res.status(404).json({ error: 'Usuario autor da publicacao nao encontrado.' });
      return;
    }

    const fileName = typeof req.body.fileName === 'string' ? req.body.fileName.trim() : '';
    const mimeType = typeof req.body.mimeType === 'string' ? req.body.mimeType.trim().toLowerCase() : '';
    const fileSize = Number(req.body.fileSize || 0);

    if (!fileName) {
      res.status(400).json({ error: 'Informe o nome do arquivo para gerar o upload.' });
      return;
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      res.status(400).json({ error: 'Formato de imagem nao suportado. Use JPG, PNG, WEBP ou GIF.' });
      return;
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      res.status(400).json({ error: 'Informe o tamanho do arquivo para gerar o upload.' });
      return;
    }

    if (fileSize > MAX_IMAGE_SIZE_BYTES) {
      res.status(400).json({ error: 'A imagem deve ter no maximo 8 MB.' });
      return;
    }

    const upload = await createFeedUploadUrl({
      fileName,
      mimeType,
      authorIdMagalu: author.id_magalu,
    });

    res.json({
      uploadUrl: upload.uploadUrl,
      imageUrl: upload.publicUrl,
      objectKey: upload.key,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function listFeedHandler(req, res) {
  try {
    const items = await getOrSetJsonCache({
      key: FEED_CACHE_KEY,
      ttlSeconds: FEED_CACHE_TTL_SECONDS,
      loader: async () => {
        const feedCollection = await getFeedCollection();

        return feedCollection.aggregate([
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'authorId',
              foreignField: '_id',
              as: 'author',
            },
          },
          {
            $unwind: {
              path: '$author',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              mensagem: 1,
              imagemUrl: 1,
              createdAt: 1,
              updatedAt: 1,
              author: {
                _id: '$author._id',
                nome: { $ifNull: ['$author.nome', 'Usuario'] },
                id_magalu: '$author.id_magalu',
                loja: '$author.loja',
              },
            },
          },
        ]).toArray();
      },
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createFeedHandler,
  createFeedUploadUrlHandler,
  listFeedHandler,
};