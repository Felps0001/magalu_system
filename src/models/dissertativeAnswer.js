const { ObjectId } = require('mongodb');

const DISSERTATIVE_ACTIVITY_CODE = 'luiza-dia-a-dia-2026';
const DISSERTATIVE_ACTIVITY_TITLE = 'Perguntas dissertativas da palestra da Luiza';
const DISSERTATIVE_ACTIVITY_POINTS = 20;
const MAX_DISSERTATIVE_ANSWER_LENGTH = 1200;
const DISSERTATIVE_QUESTIONS = Object.freeze([
  Object.freeze({
    key: 'luiza',
    title: 'Luiza',
    prompt: 'Com base na palestra da Luiza, o que voce pode fazer diferente no seu dia a dia?',
  }),
  Object.freeze({
    key: 'fred',
    title: 'Fred',
    prompt: 'O que voce como lider vai fazer para alcancar o objetivo de 2026?',
  }),
  Object.freeze({
    key: 'palestra',
    title: 'Palestra',
    prompt: 'Com base na palestra, o que voce pode fazer diferente no seu dia a dia?',
  }),
]);

const DISSERTATIVE_QUESTION_KEY_SET = new Set(DISSERTATIVE_QUESTIONS.map((question) => question.key));

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toObjectId(value, fieldName) {
  if (!value) {
    throw new Error(`O campo ${fieldName} e obrigatorio.`);
  }

  if (value instanceof ObjectId) {
    return value;
  }

  if (!ObjectId.isValid(value)) {
    throw new Error(`O campo ${fieldName} e invalido.`);
  }

  return new ObjectId(value);
}

function getQuestionByKey(questionKey) {
  const normalizedKey = normalizeString(questionKey).toLowerCase();

  return DISSERTATIVE_QUESTIONS.find((question) => question.key === normalizedKey) || null;
}

function normalizeQuestionKey(questionKey) {
  const normalizedKey = normalizeString(questionKey).toLowerCase();
  return DISSERTATIVE_QUESTION_KEY_SET.has(normalizedKey) ? normalizedKey : null;
}

function normalizeSingleAnswer({ questionKey, answerText }) {
  const question = getQuestionByKey(questionKey);

  if (!question) {
    throw new Error('A pergunta informada e invalida.');
  }

  const normalizedAnswerText = normalizeString(answerText);

  if (!normalizedAnswerText) {
    throw new Error(`Preencha a resposta de ${question.title}.`);
  }

  if (normalizedAnswerText.length > MAX_DISSERTATIVE_ANSWER_LENGTH) {
    throw new Error(`A resposta de ${question.title} deve ter no maximo ${MAX_DISSERTATIVE_ANSWER_LENGTH} caracteres.`);
  }

  return {
    questionKey: question.key,
    questionTitle: question.title,
    questionText: question.prompt,
    answerText: normalizedAnswerText,
  };
}

function normalizeExistingAnswers(answers) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers.reduce((result, answer, index) => {
    if (!answer || typeof answer !== 'object') {
      return result;
    }

    const questionKey = normalizeQuestionKey(answer.questionKey)
      || normalizeQuestionKey(answer.key)
      || (DISSERTATIVE_QUESTIONS[index] ? DISSERTATIVE_QUESTIONS[index].key : null);
    const question = questionKey ? getQuestionByKey(questionKey) : null;
    const answerText = normalizeString(answer.answerText);

    if (!question || !answerText) {
      return result;
    }

    result.push({
      questionKey: question.key,
      questionTitle: question.title,
      questionText: question.prompt,
      answerText,
    });
    return result;
  }, []);
}

function isDissertativeActivityComplete(answers) {
  const normalizedAnswers = normalizeExistingAnswers(answers);
  const answeredKeys = new Set(normalizedAnswers.map((answer) => answer.questionKey));

  return DISSERTATIVE_QUESTIONS.every((question) => answeredKeys.has(question.key));
}

function createDissertativeAnswer({ userId, authorName, authorIdMagalu }) {
  const timestamp = new Date().toISOString();
  const normalizedAuthorName = normalizeString(authorName);
  const normalizedAuthorIdMagalu = normalizeString(authorIdMagalu);

  if (!normalizedAuthorName) {
    throw new Error('Nao foi possivel identificar o nome do participante.');
  }

  return {
    userId: toObjectId(userId, 'userId'),
    activityCode: DISSERTATIVE_ACTIVITY_CODE,
    activityTitle: DISSERTATIVE_ACTIVITY_TITLE,
    authorName: normalizedAuthorName,
    authorIdMagalu: normalizedAuthorIdMagalu || null,
    answers: [],
    pontos: 0,
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

module.exports = {
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
};