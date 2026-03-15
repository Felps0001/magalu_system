const approvedFilter = document.getElementById('approved-questions-filter-palestra');
const approvedRefreshButton = document.getElementById('approved-questions-refresh-button');
const approvedStatus = document.getElementById('approved-questions-status');
const approvedUpdatedAt = document.getElementById('approved-questions-updated-at');
const approvedList = document.getElementById('approved-questions-list');
const approvedHeroTitle = document.getElementById('approved-questions-hero-title');
const approvedHeroCopy = document.getElementById('approved-questions-hero-copy');
const approvedSessionSummary = document.getElementById('approved-questions-session-summary');

const approvedQueryParams = new URLSearchParams(window.location.search);
const { palestraLabels, palestraOrder } = window.magaluQuestions;
let approvedSessionsState = [];

function formatApprovedDateTime(value) {
  if (!value) {
    return 'Agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function setApprovedStatus(message, type) {
  approvedStatus.textContent = message;
  approvedStatus.className = `form-message ${type}`;
}

function buildApprovedFilterOptions() {
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Todas as palestras';
  approvedFilter.appendChild(allOption);

  palestraOrder.forEach((palestraId) => {
    const option = document.createElement('option');
    option.value = palestraId;
    option.textContent = palestraLabels[palestraId];
    approvedFilter.appendChild(option);
  });

  const requestedPalestraId = approvedQueryParams.get('palestraId');
  approvedFilter.value = palestraLabels[requestedPalestraId] ? requestedPalestraId : 'all';
}

function updateHeroCopy() {
  const selectedPalestraId = approvedFilter.value;
  const currentSession = approvedSessionsState.find((session) => session.palestraId === selectedPalestraId) || null;

  if (selectedPalestraId === 'all') {
    approvedHeroTitle.textContent = 'Perguntas aprovadas';
    approvedHeroCopy.textContent = 'Exibicao consolidada com todas as perguntas ja aprovadas para as palestras do evento.';
    approvedSessionSummary.textContent = 'Mostrando apenas as perguntas aprovadas das sessoes ativas de cada palestra.';
    return;
  }

  approvedHeroTitle.textContent = `Perguntas aprovadas · ${palestraLabels[selectedPalestraId]}`;
  approvedHeroCopy.textContent = `Exibicao filtrada apenas com as perguntas aprovadas de ${palestraLabels[selectedPalestraId]}.`;
  approvedSessionSummary.textContent = currentSession
    ? `${currentSession.label} iniciada em ${formatApprovedDateTime(currentSession.startedAt)}.`
    : 'Exibindo a sessao ativa da palestra selecionada.';
}

function createApprovedEmptyState() {
  const emptyState = document.createElement('article');
  emptyState.className = 'questions-approved-empty';
  emptyState.textContent = 'Nenhuma pergunta aprovada para o filtro selecionado.';
  return emptyState;
}

function createApprovedCard(question) {
  const card = document.createElement('article');
  card.className = 'questions-approved-card';

  const header = document.createElement('div');
  header.className = 'questions-approved-card-header';

  const authorBlock = document.createElement('div');
  authorBlock.className = 'questions-approved-author';

  const author = document.createElement('strong');
  author.textContent = question.authorName || 'Participante';

  const palestra = document.createElement('p');
  palestra.textContent = palestraLabels[question.palestraId] || question.palestraId;

  authorBlock.appendChild(author);
  authorBlock.appendChild(palestra);

  const timestamp = document.createElement('span');
  timestamp.className = 'questions-approved-timestamp';
  timestamp.textContent = formatApprovedDateTime(question.updatedAt || question.moderatedAt || question.createdAt);

  header.appendChild(authorBlock);
  header.appendChild(timestamp);

  const text = document.createElement('p');
  text.className = 'questions-approved-text';
  text.textContent = question.texto;

  card.appendChild(header);
  card.appendChild(text);

  return card;
}

function renderApprovedQuestions(items) {
  approvedList.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    approvedList.appendChild(createApprovedEmptyState());
    return;
  }

  items.forEach((question) => {
    approvedList.appendChild(createApprovedCard(question));
  });
}

async function loadApprovedQuestions(options = {}) {
  const { silent = false } = options;
  const search = new URLSearchParams({ status: 'aprovada' });
  const selectedPalestraId = approvedFilter.value;

  if (selectedPalestraId !== 'all') {
    search.set('palestraId', selectedPalestraId);
  }

  search.set('activeSessionOnly', 'true');

  updateHeroCopy();

  if (!silent) {
    setApprovedStatus('Carregando perguntas aprovadas...', 'info-message');
  }

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions?${search.toString()}`),
      window.magaluApi.withApiDefaults()
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar as perguntas aprovadas.');
    }

    renderApprovedQuestions(data);
    approvedUpdatedAt.textContent = `Atualizado em ${formatApprovedDateTime(new Date().toISOString())}`;
    setApprovedStatus('Lista sincronizada.', 'success');
  } catch (error) {
    renderApprovedQuestions([]);
    setApprovedStatus(error.message, 'error');
  }
}

async function loadApprovedSessions() {
  const selectedPalestraId = approvedFilter.value;
  const search = new URLSearchParams();

  if (selectedPalestraId !== 'all') {
    search.set('palestraId', selectedPalestraId);
  }

  const response = await fetch(
    window.magaluApi.buildApiUrl(`/api/questions/sessions/active${search.toString() ? `?${search.toString()}` : ''}`),
    window.magaluApi.withApiDefaults()
  );
  const data = await window.magaluApi.parseApiResponse(response);

  if (!response.ok) {
    throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar a sessao ativa para exibicao.');
  }

  approvedSessionsState = Array.isArray(data) ? data : [];
  updateHeroCopy();
}

async function loadApprovedData(options = {}) {
  const { silent = false } = options;

  try {
    await loadApprovedSessions();
    await loadApprovedQuestions({ silent });
  } catch (error) {
    renderApprovedQuestions([]);
    setApprovedStatus(error.message, 'error');
  }
}

function syncFilterInUrl() {
  const nextUrl = new URL(window.location.href);

  if (approvedFilter.value === 'all') {
    nextUrl.searchParams.delete('palestraId');
  } else {
    nextUrl.searchParams.set('palestraId', approvedFilter.value);
  }

  window.history.replaceState({}, '', nextUrl);
}

buildApprovedFilterOptions();
updateHeroCopy();
loadApprovedData();

approvedFilter.addEventListener('change', () => {
  syncFilterInUrl();
  loadApprovedData();
});

approvedRefreshButton.addEventListener('click', () => {
  loadApprovedData();
});

window.setInterval(() => {
  if (!document.hidden) {
    loadApprovedData({ silent: true });
  }
}, 15000);