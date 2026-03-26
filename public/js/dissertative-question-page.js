const dissertativeCurrentUser = window.magaluApi.readStoredUser();
const dissertativePageConfig = window.MAGALU_DISSERTATIVE_CONFIG || {};
const dissertativeQuestionKey = typeof dissertativePageConfig.questionKey === 'string'
  ? dissertativePageConfig.questionKey.trim().toLowerCase()
  : '';

const dissertativeUserName = document.getElementById('dissertative-user-name');
const dissertativeUserRole = document.getElementById('dissertative-user-role');
const dissertativeAuthorName = document.getElementById('dissertative-author-name');
const dissertativeSummary = document.getElementById('dissertative-summary');
const dissertativeForm = document.getElementById('dissertative-form');
const dissertativeAnswer = document.getElementById('dissertative-answer');
const dissertativeCounter = document.getElementById('dissertative-counter');
const dissertativeSubmitButton = document.getElementById('dissertative-submit-button');
const dissertativeFormMessage = document.getElementById('dissertative-form-message');
const dissertativeBadge = document.getElementById('dissertative-badge');
const dissertativeTitle = document.getElementById('dissertative-title');
const dissertativeSubtitle = document.getElementById('dissertative-subtitle');
const dissertativeQuestionLabel = document.getElementById('dissertative-question-label');
const dissertativeQuestionPrompt = document.getElementById('dissertative-question-prompt');
const dissertativePointsBadge = document.getElementById('dissertative-points-badge');

const MAX_DISSERTATIVE_ANSWER_LENGTH = 1200;

function setDissertativeMessage(message, type) {
  dissertativeFormMessage.textContent = message;
  dissertativeFormMessage.className = `form-message feed-mobile-message ${type}`;
}

function updateDissertativeCounter() {
  dissertativeCounter.textContent = `${dissertativeAnswer.value.length}/${MAX_DISSERTATIVE_ANSWER_LENGTH}`;
}

function setDissertativeFormDisabled(isDisabled) {
  dissertativeAnswer.disabled = isDisabled;
  dissertativeSubmitButton.disabled = isDisabled;
}

async function refreshStoredUserAfterSubmit() {
  if (!dissertativeCurrentUser || !dissertativeCurrentUser._id) {
    return;
  }

  const refreshedUser = await window.magaluApi.fetchUserById(dissertativeCurrentUser._id);

  if (refreshedUser) {
    window.magaluApi.storeUser(refreshedUser);
  }
}

function getQuestionStatus(data) {
  if (!data || !Array.isArray(data.questions)) {
    return null;
  }

  return data.questions.find((question) => question.key === dissertativeQuestionKey) || null;
}

function applyQuestionMeta(questionStatus) {
  if (!questionStatus) {
    return;
  }

  document.title = `${questionStatus.title} | Pergunta Dissertativa`;
  dissertativeBadge.textContent = questionStatus.title;
  dissertativeQuestionLabel.textContent = questionStatus.title;
  dissertativeQuestionPrompt.textContent = questionStatus.prompt;
  dissertativeTitle.textContent = questionStatus.title;
}

async function loadDissertativeStatus() {
  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions/dissertative/status?userId=${encodeURIComponent(dissertativeCurrentUser._id)}&questionKey=${encodeURIComponent(dissertativeQuestionKey)}`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar esta atividade.');
    }

    const currentQuestion = getQuestionStatus(data);
    applyQuestionMeta(currentQuestion || data.question);
    if (currentQuestion && currentQuestion.answered) {
      dissertativeAnswer.value = currentQuestion.answerText || '';
      updateDissertativeCounter();
      setDissertativeFormDisabled(true);
      dissertativeSubmitButton.textContent = 'Resposta ja enviada';
      dissertativeSummary.textContent = data.alreadySubmitted
        ? `Resposta registrada. ${data.pontos} pontos ja foram adicionados ao seu total.`
        : 'Resposta desta pagina ja registrada.';
      dissertativeSubtitle.textContent = 'Esta pagina ja foi respondida por voce.';
      setDissertativeMessage('Esta pagina ja foi respondida por voce.', 'success');
      return;
    }

    setDissertativeFormDisabled(false);
    dissertativeSummary.textContent = 'Esta pagina aceita um unico envio.';
    dissertativeSubtitle.textContent = 'Responda esta pergunta dissertativa e envie seu texto.';
    dissertativePointsBadge.textContent = 'Pergunta dissertativa';
  } catch (error) {
    setDissertativeFormDisabled(true);
    setDissertativeMessage(error.message, 'error');
  }
}

async function submitDissertativeAnswer(event) {
  event.preventDefault();

  setDissertativeFormDisabled(true);
  dissertativeSubmitButton.textContent = 'Enviando...';
  setDissertativeMessage('Salvando sua resposta...', 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/questions/dissertative'),
      window.magaluApi.withApiDefaults({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: dissertativeCurrentUser._id,
          questionKey: dissertativeQuestionKey,
          answerText: dissertativeAnswer.value,
        }),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel enviar sua resposta.');
    }

    await refreshStoredUserAfterSubmit();
    dissertativeSubmitButton.textContent = 'Resposta enviada';
    dissertativeSummary.textContent = data.isComplete
      ? `Resposta enviada com sucesso. ${data.pontos} pontos adicionados ao seu total.`
      : 'Resposta salva com sucesso.';
    dissertativeSubtitle.textContent = 'Pergunta respondida com sucesso.';
    setDissertativeMessage(
      data.isComplete
        ? `Resposta enviada com sucesso. ${data.pontos} pontos adicionados.`
        : 'Resposta enviada com sucesso.',
      'success'
    );
  } catch (error) {
    setDissertativeFormDisabled(false);
    dissertativeSubmitButton.textContent = 'Enviar resposta';
    setDissertativeMessage(error.message, 'error');
  }
}

if (!dissertativeCurrentUser) {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
} else if (window.magaluApi.requiresFirstAccess(dissertativeCurrentUser)) {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
} else if (!dissertativeQuestionKey) {
  setDissertativeFormDisabled(true);
  setDissertativeMessage('Nao foi possivel identificar a pagina desta pergunta.', 'error');
} else {
  dissertativeUserName.textContent = dissertativeCurrentUser.nome || 'Participante';
  dissertativeUserRole.textContent = `${dissertativeCurrentUser.id_magalu || 'Sem id_magalu'} · atividade valendo 20 pontos`;
  dissertativeAuthorName.value = dissertativeCurrentUser.nome || '';
  updateDissertativeCounter();
  loadDissertativeStatus();
  dissertativeAnswer.addEventListener('input', updateDissertativeCounter);
  dissertativeForm.addEventListener('submit', submitDissertativeAnswer);
}