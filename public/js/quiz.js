const quizDrawerUserName = document.getElementById('quiz-drawer-user-name');
const quizDrawerUserRole = document.getElementById('quiz-drawer-user-role');
const quizMenuButton = document.getElementById('quiz-menu-button');
const quizDrawer = document.getElementById('quiz-drawer');
const quizDrawerBackdrop = document.getElementById('quiz-drawer-backdrop');
const quizCloseDrawerButton = document.getElementById('quiz-close-drawer');
const quizLogoutButton = document.getElementById('logout-button');
const quizWelcomeStep = document.getElementById('quiz-welcome-step');
const quizQuestionStep = document.getElementById('quiz-question-step');
const quizResultStep = document.getElementById('quiz-result-step');
const quizBrandSubtitle = document.getElementById('quiz-brand-subtitle');
const quizUserName = document.getElementById('quiz-user-name');
const quizUserRole = document.getElementById('quiz-user-role');
const quizWelcomeTitle = document.getElementById('quiz-welcome-title');
const quizWelcomeDescription = document.getElementById('quiz-welcome-description');
const quizStartButton = document.getElementById('quiz-start-button');
const quizQuestionTitle = document.getElementById('quiz-question-title');
const quizOptionButtons = Array.from(document.querySelectorAll('.quiz-option-button'));
const quizResultTitle = document.getElementById('quiz-result-title');
const quizResultDescription = document.getElementById('quiz-result-description');
const quizFinalScore = document.getElementById('quiz-final-score');
const quizFinalTime = document.getElementById('quiz-final-time');

const quizConfig = window.MAGALU_QUIZ_CONFIG || {};
const resolvedEstandeId = quizConfig.allowQueryParamEstandeId
  ? (new URLSearchParams(window.location.search).get('estandeId') || quizConfig.estandeId || '')
  : (quizConfig.estandeId || '');
const quizQuestions = Array.isArray(quizConfig.questions) ? quizConfig.questions : [];

let currentStep = 0;
let score = 0;
let quizStartedAt = null;
let totalTimeInSeconds = 0;

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToFirstAccess() {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setDrawerState(isOpen) {
  quizDrawer.hidden = !isOpen;
  quizDrawerBackdrop.hidden = !isOpen;
  quizDrawer.setAttribute('aria-hidden', String(!isOpen));
  quizMenuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}min ${String(seconds).padStart(2, '0')}s`;
}

function setStepVisibility(stepName) {
  quizWelcomeStep.hidden = stepName !== 'welcome';
  quizQuestionStep.hidden = stepName !== 'question';
  quizResultStep.hidden = stepName !== 'result';
}

function applyQuizConfig() {
  if (quizBrandSubtitle) {
    quizBrandSubtitle.textContent = quizConfig.brandSubtitle || 'Responda as perguntas e acumule pontos no quiz.';
  }

  if (quizUserName) {
    quizUserName.textContent = quizConfig.brandName || 'Quiz';
  }

  if (quizUserRole) {
    quizUserRole.textContent = quizConfig.brandDescription || 'Valide seus conhecimentos e registre seu check-in ao final.';
  }

  quizWelcomeTitle.textContent = quizConfig.welcomeTitle || 'Bem-vindo ao quiz!';
  quizWelcomeDescription.textContent = quizConfig.welcomeDescription || 'Responda as perguntas e ganhe pontos.';
  quizResultTitle.textContent = quizConfig.resultTitle || 'Obrigado pela participacao!';
  quizResultDescription.textContent = quizConfig.resultDescription || 'Seu quiz foi concluido.';
}

function renderQuestion() {
  const currentQuestion = quizQuestions[currentStep - 1];

  if (!currentQuestion) {
    quizResultTitle.textContent = quizConfig.resultTitle || 'Obrigado pela participacao!';
    quizResultDescription.textContent = quizConfig.resultDescription || 'Seu quiz foi concluido.';
    quizFinalScore.textContent = `${score} pontos`;
    quizFinalTime.textContent = formatDuration(totalTimeInSeconds);
    setStepVisibility('result');
    return;
  }

  quizQuestionTitle.textContent = currentQuestion.question;
  quizOptionButtons.forEach((button, index) => {
    const option = currentQuestion.options[index];
    button.hidden = !option;
    button.disabled = !option;
    button.textContent = option ? option.text : '';
  });
  setStepVisibility('question');
}

function renderQuiz() {
  if (currentStep === 0) {
    setStepVisibility('welcome');
    return;
  }

  if (currentStep > quizQuestions.length) {
    quizFinalScore.textContent = `${score} pontos`;
    quizFinalTime.textContent = formatDuration(totalTimeInSeconds);
    setStepVisibility('result');
    return;
  }

  renderQuestion();
}

function nextStep() {
  if (currentStep === 0 && !quizStartedAt) {
    quizStartedAt = Date.now();
  }

  currentStep += 1;
  renderQuiz();
}

async function refreshStoredUser(userId) {
  const response = await fetch(window.magaluApi.buildApiUrl('/api/users'), window.magaluApi.withApiDefaults());

  if (!response.ok) {
    return;
  }

  const users = await window.magaluApi.parseApiResponse(response);

  if (!Array.isArray(users)) {
    return;
  }

  const updatedUser = users.find((item) => item && item._id === userId);

  if (updatedUser) {
    window.magaluApi.storeUser(updatedUser);
  }
}

async function doCheckin(user) {
  if (!resolvedEstandeId) {
    return false;
  }

  const response = await fetch(
    window.magaluApi.buildApiUrl('/api/checkins'),
    window.magaluApi.withApiDefaults({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user._id,
        estandeId: resolvedEstandeId,
        pontos: score,
        tempo: totalTimeInSeconds,
        origem: quizConfig.quizOrigin || 'quiz',
      }),
    })
  );

  if (response.ok) {
    await refreshStoredUser(user._id);
    return true;
  }

  return false;
}

async function answer(index) {
  const currentQuestion = quizQuestions[currentStep - 1];

  if (!currentQuestion || !currentQuestion.options[index]) {
    return;
  }

  score += currentQuestion.options[index].points;
  currentStep += 1;

  const user = window.magaluApi.readStoredUser();

  if (currentStep > quizQuestions.length) {
    totalTimeInSeconds = Math.round((Date.now() - (quizStartedAt || Date.now())) / 1000);

    if (user && user._id) {
      const didCheckin = await doCheckin(user);

      if (didCheckin) {
        quizResultDescription.textContent = quizConfig.resultDescription || 'Seu check-in foi registrado.';
      } else {
        quizResultDescription.textContent = 'Seu quiz foi concluido. Para registrar pontos, configure o estandeId desta pagina.';
      }
    }
  }

  renderQuiz();
}

const currentUser = window.magaluApi.readStoredUser();

applyQuizConfig();
setDrawerState(false);

if (!currentUser) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(currentUser)) {
  redirectToFirstAccess();
} else {
  const userNameText = currentUser.nome || 'Usuario';
  const userRoleText = `${currentUser.cargo || 'Sem cargo'} · ${currentUser.loja || 'Sem loja'}`;
  quizDrawerUserName.textContent = userNameText;
  quizDrawerUserRole.textContent = userRoleText;
  renderQuiz();
}

quizStartButton.addEventListener('click', () => {
  nextStep();
});

quizOptionButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    await answer(Number(button.dataset.optionIndex));
  });
});

quizMenuButton.addEventListener('click', () => {
  setDrawerState(true);
});

quizCloseDrawerButton.addEventListener('click', () => {
  setDrawerState(false);
});

quizDrawerBackdrop.addEventListener('click', () => {
  setDrawerState(false);
});

quizLogoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !quizDrawer.hidden) {
    setDrawerState(false);
  }
});