const questionPageRoot = document.querySelector('[data-question-page]');
const questionUserName = document.getElementById('question-user-name');
const questionUserRole = document.getElementById('question-user-role');
const questionAuthorNameInput = document.getElementById('question-author-name');
const questionAuthorHint = document.getElementById('question-author-hint');
const questionTextInput = document.getElementById('question-text');
const questionForm = document.getElementById('question-form');
const questionSubmitButton = document.getElementById('question-submit-button');
const questionFormMessage = document.getElementById('question-form-message');
const questionCounter = document.getElementById('question-counter');
const questionStageBadge = document.getElementById('question-stage-badge');
const questionStageTitle = document.getElementById('question-stage-title');
const questionStageDescription = document.getElementById('question-stage-description');
const questionSwitchList = document.getElementById('question-switch-list');

const { palestraLabels, palestraOrder } = window.magaluQuestions;
const currentPalestraId = questionPageRoot ? questionPageRoot.dataset.palestraId : '';
const currentPalestraLabel = palestraLabels[currentPalestraId] || 'Palestra';
const currentUser = window.magaluApi.readStoredUser();
const MAX_QUESTION_LENGTH = 500;

function setFormMessage(message, type) {
  questionFormMessage.textContent = message;
  questionFormMessage.className = `form-message feed-mobile-message ${type}`;
}

function updateCounter() {
  const length = questionTextInput.value.length;
  questionCounter.textContent = `${length}/${MAX_QUESTION_LENGTH}`;
}

function renderStageMeta() {
  document.title = `${currentPalestraLabel} | Perguntas`;
  questionStageBadge.textContent = currentPalestraLabel;
  questionStageTitle.textContent = `Envie sua pergunta para ${currentPalestraLabel}`;
  questionStageDescription.textContent = 'Sua mensagem entra como pendente e aparece na moderacao para aprovacao ou reprovacao.';
}

function renderUserContext() {
  if (currentUser && currentUser.nome) {
    questionUserName.textContent = currentUser.nome;
    questionUserRole.textContent = `${currentPalestraLabel} · identificado pelo app`;
    questionAuthorNameInput.value = currentUser.nome;
    questionAuthorNameInput.readOnly = true;
    questionAuthorNameInput.setAttribute('aria-readonly', 'true');
    questionAuthorHint.textContent = 'Nome preenchido com base no usuario autenticado.';
    return;
  }

  questionUserName.textContent = currentPalestraLabel;
  questionUserRole.textContent = 'Preencha seu nome para enviar a pergunta para a sala correta.';
  questionAuthorHint.textContent = 'Se o usuario nao estiver autenticado, identifique-se manualmente.';
}

function renderSwitchLinks() {
  questionSwitchList.innerHTML = '';

  palestraOrder.forEach((palestraId) => {
    const link = document.createElement('a');
    const isCurrent = palestraId === currentPalestraId;

    link.className = `question-switch-link${isCurrent ? ' question-switch-link--current' : ''}`;
    link.href = window.magaluApi.buildAppUrl(`/${palestraId.replace('palestra', 'perguntas-palestra')}/`);
    link.textContent = palestraLabels[palestraId];

    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
    }

    questionSwitchList.appendChild(link);
  });
}

async function submitQuestion(event) {
  event.preventDefault();

  const payload = {
    palestraId: currentPalestraId,
    texto: questionTextInput.value,
    authorName: questionAuthorNameInput.value,
    authorUserId: currentUser && currentUser._id ? currentUser._id : '',
    authorIdMagalu: currentUser && currentUser.id_magalu ? currentUser.id_magalu : '',
  };

  questionSubmitButton.disabled = true;
  questionSubmitButton.textContent = 'Enviando...';
  setFormMessage('Enviando pergunta para a moderacao...', 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/questions'),
      window.magaluApi.withApiDefaults({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel enviar sua pergunta.');
    }

    questionTextInput.value = '';
    updateCounter();
    const sessionLabel = data && data.sessionLabel ? data.sessionLabel : 'sessao ativa';
    setFormMessage(`Pergunta enviada para ${currentPalestraLabel} na ${sessionLabel}. Ela entrou como pendente para moderacao.`, 'success');
  } catch (error) {
    setFormMessage(error.message, 'error');
  } finally {
    questionSubmitButton.disabled = false;
    questionSubmitButton.textContent = 'Enviar pergunta';
  }
}

renderStageMeta();
renderUserContext();
renderSwitchLinks();
updateCounter();

questionTextInput.addEventListener('input', updateCounter);
questionForm.addEventListener('submit', submitQuestion);