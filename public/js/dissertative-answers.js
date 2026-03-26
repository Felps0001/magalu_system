const dissertativeAdminUserName = document.getElementById('dissertative-admin-user-name');
const dissertativeAdminUserRole = document.getElementById('dissertative-admin-user-role');
const dissertativeAdminDrawerUserName = document.getElementById('dissertative-admin-drawer-user-name');
const dissertativeAdminDrawerUserRole = document.getElementById('dissertative-admin-drawer-user-role');
const dissertativeAdminStatus = document.getElementById('dissertative-admin-status');
const dissertativeAdminList = document.getElementById('dissertative-admin-list');
const dissertativeAdminTotalSubmissions = document.getElementById('dissertative-admin-total-submissions');
const dissertativeAdminTotalAnswers = document.getElementById('dissertative-admin-total-answers');
const dissertativeAdminUpdatedAt = document.getElementById('dissertative-admin-updated-at');
const dissertativeAdminRefreshButton = document.getElementById('dissertative-admin-refresh-button');
const dissertativeAdminSearchForm = document.getElementById('dissertative-admin-search-form');
const dissertativeAdminQuestionFilter = document.getElementById('dissertative-admin-question-filter');
const dissertativeAdminSearchInput = document.getElementById('dissertative-admin-search-input');
const dissertativeAdminMenuButton = document.getElementById('dissertative-admin-menu-button');
const dissertativeAdminDrawer = document.getElementById('dissertative-admin-drawer');
const dissertativeAdminDrawerBackdrop = document.getElementById('dissertative-admin-drawer-backdrop');
const dissertativeAdminCloseDrawerButton = document.getElementById('dissertative-admin-close-drawer');
const dissertativeAdminLogoutButton = document.getElementById('dissertative-admin-logout-button');

let dissertativeAdminCurrentUser = window.magaluRankingAccess && window.magaluRankingAccess.currentUser
  ? window.magaluRankingAccess.currentUser
  : null;
let dissertativeAdminDrawerCloseTimer = null;
let dissertativeAdminLastSearch = '';
let dissertativeAdminLastQuestionFilter = '';

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToFirstAccess() {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setDrawerState(isOpen) {
  if (dissertativeAdminDrawerCloseTimer) {
    clearTimeout(dissertativeAdminDrawerCloseTimer);
    dissertativeAdminDrawerCloseTimer = null;
  }

  if (isOpen) {
    dissertativeAdminDrawer.hidden = false;
    dissertativeAdminDrawerBackdrop.hidden = false;
    dissertativeAdminDrawer.classList.remove('feed-drawer--closing');
    void dissertativeAdminDrawer.offsetWidth;
  } else {
    dissertativeAdminDrawer.classList.add('feed-drawer--closing');
    dissertativeAdminDrawerCloseTimer = setTimeout(() => {
      dissertativeAdminDrawer.hidden = true;
      dissertativeAdminDrawerBackdrop.hidden = true;
      dissertativeAdminDrawer.classList.remove('feed-drawer--closing');
      dissertativeAdminDrawerCloseTimer = null;
    }, 280);
  }

  dissertativeAdminDrawer.setAttribute('aria-hidden', String(!isOpen));
  dissertativeAdminMenuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen);
}

function setStatus(message, type) {
  dissertativeAdminStatus.textContent = message;
  dissertativeAdminStatus.className = type ? `form-message ${type}` : 'form-message feed-mobile-message';
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Sem registro';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateValue));
}

function renderCurrentUser(user) {
  const userNameText = user && user.nome ? user.nome : 'Respostas dissertativas';
  const userRoleText = user
    ? `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`
    : 'Acesso restrito ao time administrativo.';

  dissertativeAdminUserName.textContent = userNameText;
  dissertativeAdminUserRole.textContent = userRoleText;
  dissertativeAdminDrawerUserName.textContent = userNameText;
  dissertativeAdminDrawerUserRole.textContent = userRoleText;
}

function buildAnswerBlock(answer) {
  const section = document.createElement('section');
  section.className = 'dissertative-admin-answer';

  const title = document.createElement('h3');
  title.className = 'dissertative-admin-answer-title';
  title.textContent = answer.questionTitle || answer.questionKey || 'Pergunta';

  const prompt = document.createElement('p');
  prompt.className = 'dissertative-admin-answer-prompt';
  prompt.textContent = answer.questionText || '';

  const text = document.createElement('p');
  text.className = 'dissertative-admin-answer-text';
  text.textContent = answer.answerText || '';

  section.appendChild(title);
  section.appendChild(prompt);
  section.appendChild(text);
  return section;
}

function getQuestionFilterLabel(questionKey) {
  if (questionKey === 'luiza') {
    return 'Luiza';
  }

  if (questionKey === 'fred') {
    return 'Fred';
  }

  if (questionKey === 'palestra') {
    return 'Palestra';
  }

  return 'todas as perguntas';
}

function buildSubmissionCard(item) {
  const card = document.createElement('article');
  card.className = 'profile-section-card dissertative-admin-card';

  const header = document.createElement('div');
  header.className = 'profile-section-header';

  const heading = document.createElement('div');

  const kicker = document.createElement('p');
  kicker.className = 'profile-section-kicker';
  kicker.textContent = item.isComplete ? 'Atividade completa' : 'Resposta parcial';
  heading.appendChild(kicker);

  const title = document.createElement('h2');
  title.className = 'profile-section-title';
  title.textContent = item.authorName || (item.user && item.user.nome) || 'Participante sem nome';
  heading.appendChild(title);

  const copy = document.createElement('p');
  copy.className = 'linktree-card-copy';
  copy.textContent = [
    item.authorIdMagalu || (item.user && item.user.id_magalu) || 'Sem id_magalu',
    item.user && item.user.cargo ? item.user.cargo : 'Sem cargo',
    item.user && item.user.filial ? item.user.filial : 'Sem filial',
  ].join(' · ');
  heading.appendChild(copy);

  const badge = document.createElement('strong');
  badge.className = 'profile-id-badge';
  badge.textContent = `${Array.isArray(item.answers) ? item.answers.length : 0} respostas`;

  header.appendChild(heading);
  header.appendChild(badge);

  const details = document.createElement('dl');
  details.className = 'profile-detail-list';
  details.innerHTML = `
    <div><dt>Pontos</dt><dd>${Number(item.pontos || 0)}</dd></div>
    <div><dt>Criado em</dt><dd>${formatDate(item.createdAt)}</dd></div>
    <div><dt>Atualizado em</dt><dd>${formatDate(item.updatedAt)}</dd></div>
    <div><dt>Concluido em</dt><dd>${formatDate(item.completedAt)}</dd></div>
  `;

  const answersContainer = document.createElement('div');
  answersContainer.className = 'dissertative-admin-answer-list';

  if (Array.isArray(item.answers) && item.answers.length > 0) {
    item.answers.forEach((answer) => {
      answersContainer.appendChild(buildAnswerBlock(answer));
    });
  } else {
    const emptyState = document.createElement('p');
    emptyState.className = 'profile-mobile-update';
    emptyState.textContent = 'Nenhuma resposta encontrada para este participante.';
    answersContainer.appendChild(emptyState);
  }

  card.appendChild(header);
  card.appendChild(details);
  card.appendChild(answersContainer);
  return card;
}

function renderSubmissions(payload) {
  const items = payload && Array.isArray(payload.items) ? payload.items : [];
  const totalAnswers = items.reduce((sum, item) => sum + (Array.isArray(item.answers) ? item.answers.length : 0), 0);
  const questionFilterLabel = getQuestionFilterLabel(dissertativeAdminLastQuestionFilter);

  dissertativeAdminList.innerHTML = '';
  dissertativeAdminTotalSubmissions.textContent = String(items.length);
  dissertativeAdminTotalAnswers.textContent = String(totalAnswers);
  dissertativeAdminUpdatedAt.textContent = `Atualizado em ${formatDate(new Date().toISOString())}`;

  if (items.length === 0) {
    setStatus(`Nenhuma resposta encontrada para ${questionFilterLabel}.`, 'info-message');
    return;
  }

  items.forEach((item) => {
    dissertativeAdminList.appendChild(buildSubmissionCard(item));
  });

  setStatus(`${items.length} participantes carregados para ${questionFilterLabel}.`, 'success');
}

async function loadSubmissions() {
  setStatus('Carregando respostas...', 'info-message');
  dissertativeAdminRefreshButton.disabled = true;
  dissertativeAdminRefreshButton.textContent = 'Atualizando...';

  try {
    if (dissertativeAdminCurrentUser && dissertativeAdminCurrentUser._id) {
      const refreshedUser = await window.magaluApi.fetchUserById(dissertativeAdminCurrentUser._id);

      if (refreshedUser) {
        dissertativeAdminCurrentUser = refreshedUser;
        window.magaluApi.storeUser(refreshedUser);
      }
    }

    renderCurrentUser(dissertativeAdminCurrentUser);

    const submissionsUrl = new URL(window.magaluApi.buildApiUrl('/api/questions/dissertative/submissions'), window.location.origin);
    submissionsUrl.searchParams.set('limit', '300');

    if (dissertativeAdminLastSearch) {
      submissionsUrl.searchParams.set('search', dissertativeAdminLastSearch);
    }

    if (dissertativeAdminLastQuestionFilter) {
      submissionsUrl.searchParams.set('questionKey', dissertativeAdminLastQuestionFilter);
    }

    const response = await fetch(
      submissionsUrl.toString(),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok || !data || !Array.isArray(data.items)) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar as respostas.');
    }

    renderSubmissions(data);
  } catch (error) {
    dissertativeAdminList.innerHTML = '';
    dissertativeAdminTotalSubmissions.textContent = '0';
    dissertativeAdminTotalAnswers.textContent = '0';
    dissertativeAdminUpdatedAt.textContent = 'Atualizacao indisponivel';
    setStatus(error.message || 'Nao foi possivel carregar as respostas.', 'error');
  } finally {
    dissertativeAdminRefreshButton.disabled = false;
    dissertativeAdminRefreshButton.textContent = 'Atualizar';
  }
}

setDrawerState(false);

if (!dissertativeAdminCurrentUser) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(dissertativeAdminCurrentUser)) {
  redirectToFirstAccess();
} else if (!window.magaluApi.canAccessRanking(dissertativeAdminCurrentUser)) {
  window.location.replace(window.magaluApi.buildAppUrl('/perfil/'));
} else {
  renderCurrentUser(dissertativeAdminCurrentUser);
  loadSubmissions();
}

dissertativeAdminRefreshButton.addEventListener('click', () => {
  loadSubmissions();
});

dissertativeAdminSearchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  dissertativeAdminLastSearch = dissertativeAdminSearchInput.value.trim();
  dissertativeAdminLastQuestionFilter = dissertativeAdminQuestionFilter.value.trim().toLowerCase();
  loadSubmissions();
});

dissertativeAdminQuestionFilter.addEventListener('change', () => {
  dissertativeAdminLastQuestionFilter = dissertativeAdminQuestionFilter.value.trim().toLowerCase();
  loadSubmissions();
});

dissertativeAdminMenuButton.addEventListener('click', () => {
  setDrawerState(true);
});

dissertativeAdminCloseDrawerButton.addEventListener('click', () => {
  setDrawerState(false);
});

dissertativeAdminDrawerBackdrop.addEventListener('click', () => {
  setDrawerState(false);
});

dissertativeAdminLogoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !dissertativeAdminDrawer.hidden) {
    setDrawerState(false);
  }
});