const { ObjectId } = require('mongodb');

const { getQuestionsCollection } = require('../config/collections');
const {
  createQuestion,
  normalizePalestraId,
  normalizeQuestionStatus,
} = require('../models/question');
const {
  ensureActiveSessionForPalestra,
  listActiveSessions,
} = require('../services/questionSessions');

function isTrueQueryValue(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

async function buildQuestionFilters(query = {}) {
  const filters = {};

  if (Object.prototype.hasOwnProperty.call(query, 'palestraId')) {
    const palestraId = normalizePalestraId(query.palestraId);

    if (!palestraId) {
      throw new Error('O filtro de palestra informado e invalido.');
    }

    filters.palestraId = palestraId;
  }

  if (Object.prototype.hasOwnProperty.call(query, 'status')) {
    const status = normalizeQuestionStatus(query.status);

    if (!status) {
      throw new Error('O filtro de status informado e invalido.');
    }

    filters.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(query, 'sessionId')) {
    filters.sessionId = typeof query.sessionId === 'string' ? query.sessionId.trim() : '';
  }

  if (isTrueQueryValue(query.activeSessionOnly)) {
    if (filters.palestraId) {
      const activeSession = await ensureActiveSessionForPalestra(filters.palestraId);
      filters.sessionId = activeSession._id;
    } else {
      const activeSessions = await listActiveSessions();
      filters.sessionId = {
        $in: activeSessions.map((session) => session._id),
      };
    }
  }

  return filters;
}

async function createQuestionHandler(req, res) {
  try {
    const questionsCollection = await getQuestionsCollection();
    const activeSession = await ensureActiveSessionForPalestra(req.body.palestraId);
    const question = createQuestion({
      ...req.body,
      sessionId: activeSession._id,
      sessionLabel: activeSession.label,
    });
    const result = await questionsCollection.insertOne(question);

    res.status(201).json({
      _id: result.insertedId,
      ...question,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function listQuestionsHandler(req, res) {
  try {
    const questionsCollection = await getQuestionsCollection();
    const filters = await buildQuestionFilters(req.query);
    const questions = await questionsCollection.find(filters).sort({ updatedAt: -1, createdAt: -1 }).toArray();

    res.json(questions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateQuestionStatusHandler(req, res) {
  try {
    const { questionId } = req.params;
    const status = normalizeQuestionStatus(req.body.status);
    const moderatedByName = typeof req.body.moderatedByName === 'string'
      ? req.body.moderatedByName.trim()
      : '';

    if (!ObjectId.isValid(questionId)) {
      res.status(400).json({ error: 'O id da pergunta informado e invalido.' });
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'O status informado e invalido.' });
      return;
    }

    const questionsCollection = await getQuestionsCollection();
    const existingQuestion = await questionsCollection.findOne({ _id: new ObjectId(questionId) });

    if (!existingQuestion) {
      res.status(404).json({ error: 'Pergunta nao encontrada.' });
      return;
    }

    const updatedAt = new Date().toISOString();

    await questionsCollection.updateOne(
      { _id: existingQuestion._id },
      {
        $set: {
          status,
          updatedAt,
          moderatedAt: updatedAt,
          moderatedByName: moderatedByName || null,
        },
      }
    );

    const updatedQuestion = await questionsCollection.findOne({ _id: existingQuestion._id });

    res.json(updatedQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createQuestionHandler,
  listQuestionsHandler,
  updateQuestionStatusHandler,
};