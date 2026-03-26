const { ObjectId } = require('mongodb');

const { getDissertativeAnswersCollection, getUsersCollection } = require('../config/collections');
const { buildCacheKey, deleteCacheByPrefix, deleteCacheKeys } = require('../services/cache');
const {
  DISSERTATIVE_ACTIVITY_CODE,
  DISSERTATIVE_ACTIVITY_POINTS,
  DISSERTATIVE_ACTIVITY_TITLE,
  DISSERTATIVE_QUESTIONS,
  MAX_DISSERTATIVE_ANSWER_LENGTH,
  createDissertativeAnswer,
  getQuestionByKey,
  isDissertativeActivityComplete,
  normalizeExistingAnswers,
  normalizeQuestionKey,
  normalizeSingleAnswer,
} = require('../models/dissertativeAnswer');

function normalizeStoredResponse(response) {
  if (!response) {
    return null;
  }

  const normalizedAnswers = normalizeExistingAnswers(response.answers);
  const isComplete = isDissertativeActivityComplete(normalizedAnswers);

  return {
    _id: response._id ? String(response._id) : null,
    userId: response.userId ? String(response.userId) : null,
    activityCode: response.activityCode,
    activityTitle: response.activityTitle,
    authorName: response.authorName,
    authorIdMagalu: response.authorIdMagalu || null,
    answers: normalizedAnswers,
    pontos: Number(isComplete ? response.pontos || DISSERTATIVE_ACTIVITY_POINTS : 0),
    isComplete,
    completedAt: response.completedAt || null,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

function buildQuestionStatusList(submission) {
  const normalizedSubmission = normalizeStoredResponse(submission);
  const answerMap = new Map((normalizedSubmission && normalizedSubmission.answers) || []
    .map((answer) => [answer.questionKey, answer]));

  return DISSERTATIVE_QUESTIONS.map((question) => {
    const answer = answerMap.get(question.key);

    return {
      key: question.key,
      title: question.title,
      prompt: question.prompt,
      answered: Boolean(answer),
      answerText: answer ? answer.answerText : '',
    };
  });
}

async function getDissertativeAnswerStatusHandler(req, res) {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const questionKey = normalizeQuestionKey(req.query.questionKey);

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O usuario informado e invalido.' });
      return;
    }

    const dissertativeAnswersCollection = await getDissertativeAnswersCollection();
    const existingResponse = await dissertativeAnswersCollection.findOne({
      userId: new ObjectId(userId),
      activityCode: DISSERTATIVE_ACTIVITY_CODE,
    });

    const questions = buildQuestionStatusList(existingResponse);
    const currentQuestion = questionKey ? getQuestionByKey(questionKey) : null;

    res.json({
      activityCode: DISSERTATIVE_ACTIVITY_CODE,
      activityTitle: DISSERTATIVE_ACTIVITY_TITLE,
      pontos: DISSERTATIVE_ACTIVITY_POINTS,
      maxAnswerLength: MAX_DISSERTATIVE_ANSWER_LENGTH,
      questions,
      question: currentQuestion,
      alreadySubmitted: Boolean(existingResponse && isDissertativeActivityComplete(existingResponse.answers)),
      submission: normalizeStoredResponse(existingResponse),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createDissertativeAnswerHandler(req, res) {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : '';
    const questionKey = normalizeQuestionKey(req.body.questionKey);

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O usuario informado e invalido.' });
      return;
    }

    if (!questionKey) {
      res.status(400).json({ error: 'A pergunta informada e invalida.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { nome: 1, id_magalu: 1 } }
    );

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    const dissertativeAnswersCollection = await getDissertativeAnswersCollection();
    const existingResponse = await dissertativeAnswersCollection.findOne({
      userId: user._id,
      activityCode: DISSERTATIVE_ACTIVITY_CODE,
    });

    const normalizedExistingAnswers = normalizeExistingAnswers(existingResponse && existingResponse.answers);

    if (normalizedExistingAnswers.some((answer) => answer.questionKey === questionKey)) {
      res.status(409).json({
        error: 'A resposta desta pagina ja foi enviada para este usuario.',
        code: 'DISSERTATIVE_QUESTION_ALREADY_SUBMITTED',
        alreadySubmitted: true,
        submission: normalizeStoredResponse(existingResponse),
      });
      return;
    }

    const normalizedAnswer = normalizeSingleAnswer({
      questionKey,
      answerText: req.body.answerText,
    });
    const timestamp = new Date().toISOString();
    const nextAnswers = [...normalizedExistingAnswers, normalizedAnswer];
    const isComplete = isDissertativeActivityComplete(nextAnswers);
    const nextPontos = isComplete ? DISSERTATIVE_ACTIVITY_POINTS : 0;

    let persistedResponse;

    if (!existingResponse) {
      const submission = createDissertativeAnswer({
        userId: user._id,
        authorName: user.nome,
        authorIdMagalu: user.id_magalu,
      });

      submission.answers = nextAnswers;
      submission.pontos = nextPontos;
      submission.updatedAt = timestamp;
      submission.completedAt = isComplete ? timestamp : null;
      const insertResult = await dissertativeAnswersCollection.insertOne(submission);
      persistedResponse = {
        _id: insertResult.insertedId,
        ...submission,
      };
    } else {
      await dissertativeAnswersCollection.updateOne(
        { _id: existingResponse._id },
        {
          $set: {
            answers: nextAnswers,
            pontos: nextPontos,
            updatedAt: timestamp,
            completedAt: isComplete ? (existingResponse.completedAt || timestamp) : null,
          },
        }
      );

      persistedResponse = await dissertativeAnswersCollection.findOne({ _id: existingResponse._id });
    }

    await deleteCacheKeys([
      buildCacheKey(['auth', 'login', user.id_magalu]),
    ]);
    await deleteCacheByPrefix('users:');

    res.status(201).json({
      alreadySubmitted: false,
      isComplete,
      pontos: nextPontos,
      activityCode: DISSERTATIVE_ACTIVITY_CODE,
      activityTitle: DISSERTATIVE_ACTIVITY_TITLE,
      question: getQuestionByKey(questionKey),
      questions: buildQuestionStatusList(persistedResponse),
      submission: normalizeStoredResponse(persistedResponse),
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        error: 'A resposta desta pagina ja foi enviada para este usuario.',
        code: 'DISSERTATIVE_QUESTION_ALREADY_SUBMITTED',
        alreadySubmitted: true,
      });
      return;
    }

    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createDissertativeAnswerHandler,
  getDissertativeAnswerStatusHandler,
};