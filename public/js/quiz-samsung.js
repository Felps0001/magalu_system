const quizDrawerUserName = document.getElementById('quiz-drawer-user-name');
const quizDrawerUserRole = document.getElementById('quiz-drawer-user-role');
const quizMenuButton = document.getElementById('quiz-menu-button');
const quizDrawer = document.getElementById('quiz-drawer');
const quizDrawerBackdrop = document.getElementById('quiz-drawer-backdrop');
const quizCloseDrawerButton = document.getElementById('quiz-close-drawer');
const quizLogoutButton = document.getElementById('logout-button');
const quizContainer = document.getElementById('quiz');

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

function renderQuiz() {
  const current = quizSteps[currentStep];

  if (current.welcome) {
    quizContainer.innerHTML = `
      <div class="quiz-header">
        <p class="profile-section-kicker">Desafio interativo</p>
        <h2 class="quiz-title">${current.title}</h2>
        <p class="quiz-description">${current.description}</p>
      </div>
      <button class="quiz-btn" type="button" data-action="next-step">Iniciar</button>
    `;
    return;
  }

  if (current.thankyou) {
    quizContainer.innerHTML = `
      <div class="quiz-header">
        <p class="profile-section-kicker">Resultado final</p>
        <h2 class="quiz-title">${current.title}</h2>
        <p class="quiz-description">${current.description}</p>
      </div>
      <div class="quiz-summary">
        <div>
          <span class="quiz-summary-label">Pontuacao</span>
          <strong>${score} pontos</strong>
        </div>
        <div>
          <span class="quiz-summary-label">Tempo total</span>
          <strong>${formatDuration(totalTimeInSeconds)}</strong>
        </div>
      </div>
      <div class="quiz-footer">Magalu System</div>
    `;
    return;
  }

  quizContainer.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-score">Pontuacao: ${score}</div>
      <h2 class="quiz-title">${current.question}</h2>
    </div>
    <div class="quiz-options">
      ${current.options
        .map(
          (option, index) => `
            <button class="quiz-btn" type="button" data-answer-index="${index}">${option.text}</button>
          `
        )
        .join('')}
    </div>
  `;
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

quizContainer.addEventListener('click', async (event) => {
  const nextButton = event.target.closest('[data-action="next-step"]');

  if (nextButton) {
    nextStep();
    return;
  }

  const answerButton = event.target.closest('[data-answer-index]');

  if (!answerButton) {
    return;
  }

  await answer(Number(answerButton.dataset.answerIndex));
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