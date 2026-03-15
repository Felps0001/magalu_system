const moderationFilter = document.getElementById('questions-filter-palestra');
const moderationRefreshButton = document.getElementById('questions-refresh-button');
const moderationStatus = document.getElementById('questions-board-status');
const moderationUpdatedAt = document.getElementById('questions-board-updated-at');
const moderationBoard = document.getElementById('questions-board');
const moderationSessionSummary = document.getElementById('questions-session-summary');
const moderationStartSessionButton = document.getElementById('questions-start-session-button');

const { palestraLabels, palestraOrder, statusLabels, statusOrder } = window.magaluQuestions;
const columnBodies = new Map();
const columnCounts = new Map();
const queryParams = new URLSearchParams(window.location.search);

let questionsState = [];
let activeSessionsState = [];
let draggedQuestionId = null;
let isSyncing = false;

function formatDateTime(value) {
  if (!value) {
    return 'Agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function setBoardStatus(message, type) {
  moderationStatus.textContent = message;
  moderationStatus.className = `form-message ${type}`;
}

function getSelectedPalestraId() {
  return moderationFilter.value;
}

function findActiveSessionForSelection() {
  const selectedPalestraId = getSelectedPalestraId();

  if (selectedPalestraId === 'all') {
    return null;
  }

  return activeSessionsState.find((session) => session.palestraId === selectedPalestraId) || null;
}

function renderSessionSummary() {
  const selectedPalestraId = getSelectedPalestraId();
  const currentSession = findActiveSessionForSelection();

  if (selectedPalestraId === 'all') {
    moderationSessionSummary.textContent = 'Mostrando apenas as perguntas das sessoes ativas de cada palestra. Para iniciar nova sessao, selecione uma palestra especifica.';
    moderationStartSessionButton.disabled = true;
    return;
  }

  moderationStartSessionButton.disabled = false;

  if (!currentSession) {
    moderationSessionSummary.textContent = `Nenhuma sessao ativa carregada para ${palestraLabels[selectedPalestraId]}.`;
    return;
  }

  moderationSessionSummary.textContent = `${palestraLabels[selectedPalestraId]} · ${currentSession.label} iniciada em ${formatDateTime(currentSession.startedAt)}.`;
}

function buildFilterOptions() {
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Todas as palestras';
  moderationFilter.appendChild(allOption);

  palestraOrder.forEach((palestraId) => {
    const option = document.createElement('option');
    option.value = palestraId;
    option.textContent = palestraLabels[palestraId];
    moderationFilter.appendChild(option);
  });

  const requestedPalestraId = queryParams.get('palestraId');
  moderationFilter.value = palestraLabels[requestedPalestraId] ? requestedPalestraId : 'all';
}

function createEmptyState(label) {
  const emptyState = document.createElement('div');
  emptyState.className = 'questions-board-empty';
  emptyState.textContent = `Nenhuma pergunta em ${label.toLowerCase()}.`;
  return emptyState;
}

function createActionButton(questionId, status) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `questions-card-action questions-card-action--${status}`;
  button.textContent = statusLabels[status];
  button.disabled = isSyncing;
  button.addEventListener('click', () => {
    updateQuestionStatus(questionId, status);
  });
  return button;
}

function createQuestionCard(question) {
  const card = document.createElement('article');
  card.className = 'questions-card';
  card.draggable = true;
  card.dataset.questionId = question._id;

  card.addEventListener('dragstart', () => {
    draggedQuestionId = question._id;
    card.classList.add('questions-card--dragging');
  });

  card.addEventListener('dragend', () => {
    draggedQuestionId = null;
    card.classList.remove('questions-card--dragging');
  });

  const meta = document.createElement('div');
  meta.className = 'questions-card-meta';

  const palestraBadge = document.createElement('span');
  palestraBadge.className = 'questions-card-badge';
  palestraBadge.textContent = palestraLabels[question.palestraId] || question.palestraId;

  const timestamp = document.createElement('span');
  timestamp.className = 'questions-card-timestamp';
  timestamp.textContent = formatDateTime(question.updatedAt || question.createdAt);

  meta.appendChild(palestraBadge);
  meta.appendChild(timestamp);

  const author = document.createElement('strong');
  author.className = 'questions-card-author';
  author.textContent = question.authorName || 'Participante';

  const text = document.createElement('p');
  text.className = 'questions-card-text';
  text.textContent = question.texto;

  const actions = document.createElement('div');
  actions.className = 'questions-card-actions';

  statusOrder.forEach((status) => {
    if (status === question.status) {
      return;
    }

    actions.appendChild(createActionButton(question._id, status));
  });

  card.appendChild(meta);
  card.appendChild(author);
  card.appendChild(text);
  card.appendChild(actions);

  return card;
}

function renderBoard() {
  statusOrder.forEach((status) => {
    const columnBody = columnBodies.get(status);
    const columnCount = columnCounts.get(status);
    const items = questionsState.filter((question) => question.status === status);

    columnBody.innerHTML = '';
    columnCount.textContent = String(items.length);

    if (items.length === 0) {
      columnBody.appendChild(createEmptyState(statusLabels[status]));
      return;
    }

    items.forEach((question) => {
      columnBody.appendChild(createQuestionCard(question));
    });
  });
}

async function loadQuestions(options = {}) {
  const { silent = false } = options;
  const selectedPalestraId = getSelectedPalestraId();
  const search = new URLSearchParams();

  if (selectedPalestraId !== 'all') {
    search.set('palestraId', selectedPalestraId);
  }

  search.set('activeSessionOnly', 'true');

  if (!silent) {
    setBoardStatus('Carregando perguntas...', 'info-message');
  }

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions${search.toString() ? `?${search.toString()}` : ''}`),
      window.magaluApi.withApiDefaults()
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar as perguntas.');
    }

    questionsState = Array.isArray(data) ? data : [];
    renderBoard();
    moderationUpdatedAt.textContent = `Atualizado em ${formatDateTime(new Date().toISOString())}`;
    setBoardStatus('Quadro sincronizado.', 'success');
  } catch (error) {
    setBoardStatus(error.message, 'error');
  }
}

async function loadActiveSessions() {
  const selectedPalestraId = getSelectedPalestraId();
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
    throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar a sessao ativa.');
  }

  activeSessionsState = Array.isArray(data) ? data : [];
  renderSessionSummary();
}

async function loadBoardData(options = {}) {
  const { silent = false } = options;

  try {
    await loadActiveSessions();
    await loadQuestions({ silent });
  } catch (error) {
    setBoardStatus(error.message, 'error');
  }
}

async function updateQuestionStatus(questionId, nextStatus) {
  const currentQuestion = questionsState.find((question) => question._id === questionId);

  if (!currentQuestion || currentQuestion.status === nextStatus || isSyncing) {
    return;
  }

  isSyncing = true;
  setBoardStatus(`Movendo pergunta para ${statusLabels[nextStatus].toLowerCase()}...`, 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions/${encodeURIComponent(questionId)}/status`),
      window.magaluApi.withApiDefaults({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          moderatedByName: 'Moderacao',
        }),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel atualizar o status da pergunta.');
    }

    questionsState = questionsState.map((question) => (
      question._id === questionId ? data : question
    ));
    renderBoard();
    moderationUpdatedAt.textContent = `Atualizado em ${formatDateTime(data.updatedAt)}`;
    setBoardStatus('Status atualizado com sucesso.', 'success');
  } catch (error) {
    setBoardStatus(error.message, 'error');
  } finally {
    isSyncing = false;
  }
}

function setupColumns() {
  moderationBoard.querySelectorAll('[data-question-status]').forEach((column) => {
    const status = column.dataset.questionStatus;
    const body = column.querySelector('[data-question-dropzone]');
    const count = column.querySelector('[data-question-count]');

    columnBodies.set(status, body);
    columnCounts.set(status, count);

    body.addEventListener('dragover', (event) => {
      event.preventDefault();
      body.classList.add('questions-column-body--active');
    });

    body.addEventListener('dragleave', () => {
      body.classList.remove('questions-column-body--active');
    });

    body.addEventListener('drop', (event) => {
      event.preventDefault();
      body.classList.remove('questions-column-body--active');

      if (!draggedQuestionId) {
        return;
      }

      updateQuestionStatus(draggedQuestionId, status);
    });
  });
}

function syncFilterInUrl() {
  const nextUrl = new URL(window.location.href);

  if (moderationFilter.value === 'all') {
    nextUrl.searchParams.delete('palestraId');
  } else {
    nextUrl.searchParams.set('palestraId', moderationFilter.value);
  }

  window.history.replaceState({}, '', nextUrl);
}

async function startNewSession() {
  const selectedPalestraId = getSelectedPalestraId();

  if (selectedPalestraId === 'all' || isSyncing) {
    return;
  }

  const confirmed = window.confirm(`Abrir uma nova sessao para ${palestraLabels[selectedPalestraId]}? As perguntas atuais saem do quadro ativo, mas continuam salvas no historico.`);

  if (!confirmed) {
    return;
  }

  isSyncing = true;
  moderationStartSessionButton.disabled = true;
  setBoardStatus('Abrindo nova sessao...', 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/questions/sessions/start'),
      window.magaluApi.withApiDefaults({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ palestraId: selectedPalestraId }),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel iniciar uma nova sessao.');
    }

    await loadBoardData();
    moderationUpdatedAt.textContent = `Atualizado em ${formatDateTime(data.startedAt)}`;
    setBoardStatus(`Nova ${data.label.toLowerCase()} iniciada com sucesso.`, 'success');
  } catch (error) {
    setBoardStatus(error.message, 'error');
  } finally {
    isSyncing = false;
    renderSessionSummary();
  }
}

buildFilterOptions();
setupColumns();
loadBoardData();

moderationFilter.addEventListener('change', () => {
  syncFilterInUrl();
  loadBoardData();
});

moderationRefreshButton.addEventListener('click', () => {
  loadBoardData();
});

moderationStartSessionButton.addEventListener('click', () => {
  startNewSession();
});

window.setInterval(() => {
  if (!draggedQuestionId && !isSyncing && !document.hidden) {
    loadBoardData({ silent: true });
  }
}, 15000);