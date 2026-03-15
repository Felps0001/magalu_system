const QUESTION_STATUSES = Object.freeze(['reprovada', 'pendente', 'aprovada']);
const PALESTRA_IDS = Object.freeze(['palestra-1', 'palestra-2', 'palestra-3']);
const MAX_QUESTION_LENGTH = 500;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeQuestionStatus(value) {
  const normalizedValue = normalizeString(value).toLowerCase();

  return QUESTION_STATUSES.includes(normalizedValue) ? normalizedValue : null;
}

function normalizePalestraId(value) {
  const normalizedValue = normalizeString(value).toLowerCase();

  return PALESTRA_IDS.includes(normalizedValue) ? normalizedValue : null;
}

function createQuestion({ palestraId, texto, authorName, authorUserId, authorIdMagalu, sessionId, sessionLabel }) {
  const normalizedPalestraId = normalizePalestraId(palestraId);
  const normalizedText = normalizeString(texto);
  const normalizedAuthorName = normalizeString(authorName);
  const normalizedSessionId = normalizeString(sessionId);
  const normalizedSessionLabel = normalizeString(sessionLabel);

  if (!normalizedPalestraId) {
    throw new Error('A palestra informada e invalida.');
  }

  if (!normalizedText) {
    throw new Error('Digite a pergunta antes de enviar.');
  }

  if (normalizedText.length > MAX_QUESTION_LENGTH) {
    throw new Error(`A pergunta deve ter no maximo ${MAX_QUESTION_LENGTH} caracteres.`);
  }

  if (!normalizedAuthorName) {
    throw new Error('Informe o nome do participante para enviar a pergunta.');
  }

  if (!normalizedSessionId) {
    throw new Error('Nao foi possivel identificar a sessao ativa desta palestra.');
  }

  const timestamp = new Date().toISOString();

  return {
    palestraId: normalizedPalestraId,
    sessionId: normalizedSessionId,
    sessionLabel: normalizedSessionLabel || 'Sessao atual',
    texto: normalizedText,
    authorName: normalizedAuthorName,
    authorUserId: normalizeString(authorUserId) || null,
    authorIdMagalu: normalizeString(authorIdMagalu) || null,
    status: 'pendente',
    createdAt: timestamp,
    updatedAt: timestamp,
    moderatedAt: null,
    moderatedByName: null,
  };
}

module.exports = {
  MAX_QUESTION_LENGTH,
  PALESTRA_IDS,
  QUESTION_STATUSES,
  createQuestion,
  normalizePalestraId,
  normalizeQuestionStatus,
};