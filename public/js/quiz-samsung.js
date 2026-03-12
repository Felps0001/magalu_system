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
const quizWelcomeTitle = document.getElementById('quiz-welcome-title');
const quizWelcomeDescription = document.getElementById('quiz-welcome-description');
const quizStartButton = document.getElementById('quiz-start-button');
const quizQuestionTitle = document.getElementById('quiz-question-title');
const quizOptionButtons = Array.from(document.querySelectorAll('.quiz-option-button'));
const quizResultTitle = document.getElementById('quiz-result-title');
const quizResultDescription = document.getElementById('quiz-result-description');
const quizFinalScore = document.getElementById('quiz-final-score');
const quizFinalTime = document.getElementById('quiz-final-time');

const estandeId = '69b054445c804b21df9b2022';
const quizSteps = [
  {
    welcome: true,
    title: 'Bem-vindo ao Quiz Samsung!',
    description: 'Responda as perguntas e ganhe pontos. Boa sorte!',
  },
  {
    question: 'Qual e a tecnologia de tela exclusiva da Samsung?',
    options: [
      { text: 'OLED', points: 0 },
      { text: 'QLED', points: 2 },
      { text: 'LCD', points: 0 },
    ],
  },
  {
    question: 'Qual linha de smartphones Samsung e voltada para alta performance?',
    options: [
      { text: 'Galaxy A', points: 0 },
      { text: 'Galaxy S', points: 2 },
      { text: 'Galaxy M', points: 0 },
    ],
  },
  {
    question: 'Qual recurso exclusivo da linha Galaxy Note?',
    options: [
      { text: 'S Pen', points: 4 },
      { text: 'Camera tripla', points: 0 },
      { text: 'Tela curva', points: 0 },
    ],
  },
  {
    question: 'Qual e o sistema operacional dos smartphones Samsung?',
    options: [
      { text: 'Android', points: 2 },
      { text: 'iOS', points: 0 },
      { text: 'HarmonyOS', points: 0 },
    ],
  },
  {
    thankyou: true,
    title: 'Obrigado pela participacao!',
    description: 'Seu check-in foi registrado.',
  },
];

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

function renderQuiz() {
  const current = quizSteps[currentStep];

  if (current.welcome) {
    quizWelcomeTitle.textContent = current.title;
    quizWelcomeDescription.textContent = current.description;
    setStepVisibility('welcome');
    return;
  }

  if (current.thankyou) {
    quizResultTitle.textContent = current.title;
    quizResultDescription.textContent = current.description;
    quizFinalScore.textContent = `${score} pontos`;
    quizFinalTime.textContent = formatDuration(totalTimeInSeconds);
    setStepVisibility('result');
    return;
  }

  quizQuestionTitle.textContent = current.question;
  quizOptionButtons.forEach((button, index) => {
    const option = current.options[index];
    button.hidden = !option;
    button.disabled = !option;
    button.textContent = option ? option.text : '';
  });
  setStepVisibility('question');
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
  const response = await fetch(
    window.magaluApi.buildApiUrl('/api/checkins'),
    window.magaluApi.withApiDefaults({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user._id,
        estandeId,
        pontos: score,
        tempo: totalTimeInSeconds,
        origem: 'quiz-samsung',
      }),
    })
  );

  if (response.ok) {
    await refreshStoredUser(user._id);
  }
}

async function answer(index) {
  const current = quizSteps[currentStep];
  score += current.options[index].points;
  currentStep += 1;

  const user = window.magaluApi.readStoredUser();

  if (currentStep === quizSteps.length - 1) {
    totalTimeInSeconds = Math.round((Date.now() - (quizStartedAt || Date.now())) / 1000);

    if (user && user._id) {
      await doCheckin(user);
    }
  }

  renderQuiz();
}

const currentUser = window.magaluApi.readStoredUser();

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