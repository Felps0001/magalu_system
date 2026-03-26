const dissertativeCurrentUser = window.magaluApi.readStoredUser();
const dissertativeUserName = document.getElementById('dissertative-user-name');
const dissertativeUserRole = document.getElementById('dissertative-user-role');
const dissertativeAuthorName = document.getElementById('dissertative-author-name');
const dissertativeSummary = document.getElementById('dissertative-summary');
const dissertativeForm = document.getElementById('dissertative-form');
const dissertativeAnswer1 = document.getElementById('dissertative-answer-1');
const dissertativeAnswer2 = document.getElementById('dissertative-answer-2');
const dissertativeAnswer3 = document.getElementById('dissertative-answer-3');
const dissertativeCounter1 = document.getElementById('dissertative-counter-1');
const dissertativeCounter2 = document.getElementById('dissertative-counter-2');
const dissertativeCounter3 = document.getElementById('dissertative-counter-3');
const dissertativeSubmitButton = document.getElementById('dissertative-submit-button');
const dissertativeFormMessage = document.getElementById('dissertative-form-message');

const MAX_DISSERTATIVE_ANSWER_LENGTH = 1200;

function setDissertativeMessage(message, type) {
  dissertativeFormMessage.textContent = message;
  dissertativeFormMessage.className = `form-message feed-mobile-message ${type}`;
}

function updateDissertativeCounter(element, counterElement) {
  counterElement.textContent = `${element.value.length}/${MAX_DISSERTATIVE_ANSWER_LENGTH}`;
}

function setDissertativeFormDisabled(isDisabled) {
  dissertativeAnswer1.disabled = isDisabled;
  dissertativeAnswer2.disabled = isDisabled;
  dissertativeAnswer3.disabled = isDisabled;
  dissertativeSubmitButton.disabled = isDisabled;
}

function fillDissertativeAnswers(submission) {
  if (!submission || !Array.isArray(submission.answers)) {
    return;
  }

  const firstAnswer = submission.answers.find((answer) => answer.questionIndex === 0);
  const secondAnswer = submission.answers.find((answer) => answer.questionIndex === 1);
  const thirdAnswer = submission.answers.find((answer) => answer.questionIndex === 2);

  dissertativeAnswer1.value = firstAnswer ? firstAnswer.answerText : '';
  dissertativeAnswer2.value = secondAnswer ? secondAnswer.answerText : '';
  dissertativeAnswer3.value = thirdAnswer ? thirdAnswer.answerText : '';
  updateDissertativeCounter(dissertativeAnswer1, dissertativeCounter1);
  updateDissertativeCounter(dissertativeAnswer2, dissertativeCounter2);
  updateDissertativeCounter(dissertativeAnswer3, dissertativeCounter3);
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

async function loadDissertativeStatus() {
  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions/dissertative/status?userId=${encodeURIComponent(dissertativeCurrentUser._id)}`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar esta atividade.');
    }

    if (data.alreadySubmitted) {
      fillDissertativeAnswers(data.submission);
      setDissertativeFormDisabled(true);
      dissertativeSubmitButton.textContent = 'Respostas ja enviadas';
      dissertativeSummary.textContent = `Atividade concluida. ${data.pontos} pontos ja foram adicionados ao seu total.`;
      setDissertativeMessage('Esta atividade ja foi respondida por voce.', 'success');
      return;
    }

    setDissertativeFormDisabled(false);
    dissertativeSummary.textContent = `Cada participante pode enviar esta atividade uma unica vez. Valor total: ${data.pontos} pontos.`;
  } catch (error) {
    setDissertativeFormDisabled(true);
    setDissertativeMessage(error.message, 'error');
  }
}

async function submitDissertativeAnswers(event) {
  event.preventDefault();

  setDissertativeFormDisabled(true);
  dissertativeSubmitButton.textContent = 'Enviando...';
  setDissertativeMessage('Salvando suas respostas...', 'info-message');

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
          answers: [
            dissertativeAnswer1.value,
            dissertativeAnswer2.value,
            dissertativeAnswer3.value,
          ],
        }),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel enviar suas respostas.');
    }

    await refreshStoredUserAfterSubmit();
    fillDissertativeAnswers(data.submission);
    dissertativeSubmitButton.textContent = 'Respostas enviadas';
    dissertativeSummary.textContent = `Atividade concluida com sucesso. ${data.pontos} pontos adicionados ao seu total.`;
    setDissertativeMessage(`Respostas enviadas com sucesso. ${data.pontos} pontos adicionados.`, 'success');
  } catch (error) {
    setDissertativeFormDisabled(false);
    dissertativeSubmitButton.textContent = 'Enviar respostas';
    setDissertativeMessage(error.message, 'error');
  }
}

if (!dissertativeCurrentUser) {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
} else if (window.magaluApi.requiresFirstAccess(dissertativeCurrentUser)) {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
} else {
  dissertativeUserName.textContent = dissertativeCurrentUser.nome || 'Participante';
  dissertativeUserRole.textContent = `${dissertativeCurrentUser.id_magalu || 'Sem id_magalu'} · atividade valendo 20 pontos`;
  dissertativeAuthorName.value = dissertativeCurrentUser.nome || '';
  updateDissertativeCounter(dissertativeAnswer1, dissertativeCounter1);
  updateDissertativeCounter(dissertativeAnswer2, dissertativeCounter2);
  updateDissertativeCounter(dissertativeAnswer3, dissertativeCounter3);
  loadDissertativeStatus();

  dissertativeAnswer1.addEventListener('input', () => {
    updateDissertativeCounter(dissertativeAnswer1, dissertativeCounter1);
  });

  dissertativeAnswer2.addEventListener('input', () => {
    updateDissertativeCounter(dissertativeAnswer2, dissertativeCounter2);
  });

  dissertativeAnswer3.addEventListener('input', () => {
    updateDissertativeCounter(dissertativeAnswer3, dissertativeCounter3);
  });

  dissertativeForm.addEventListener('submit', submitDissertativeAnswers);
}