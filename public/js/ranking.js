const rankingUserName = document.getElementById('ranking-user-name');
const rankingUserRole = document.getElementById('ranking-user-role');
const rankingDrawerUserName = document.getElementById('ranking-drawer-user-name');
const rankingDrawerUserRole = document.getElementById('ranking-drawer-user-role');
const rankingStatus = document.getElementById('ranking-status');
const rankingList = document.getElementById('ranking-list');
const rankingParticipants = document.getElementById('ranking-total-participants');
const rankingLeaderScore = document.getElementById('ranking-leader-score');
const rankingUpdatedAt = document.getElementById('ranking-updated-at');
const rankingRefreshButton = document.getElementById('ranking-refresh-button');
const rankingDiretoriaFilter = document.getElementById('ranking-diretoria-filter');
const rankingMenuButton = document.getElementById('ranking-menu-button');
const rankingDrawer = document.getElementById('ranking-drawer');
const rankingDrawerBackdrop = document.getElementById('ranking-drawer-backdrop');
const rankingCloseDrawerButton = document.getElementById('ranking-close-drawer');
const rankingLogoutButton = document.getElementById('logout-button');

let currentUser = window.magaluRankingAccess && window.magaluRankingAccess.currentUser
  ? window.magaluRankingAccess.currentUser
  : null;
let drawerCloseTimer = null;
let fullRankingData = [];

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToFirstAccess() {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setDrawerState(isOpen) {
  if (drawerCloseTimer) {
    clearTimeout(drawerCloseTimer);
    drawerCloseTimer = null;
  }

  if (isOpen) {
    rankingDrawer.hidden = false;
    rankingDrawerBackdrop.hidden = false;
    rankingDrawer.classList.remove('feed-drawer--closing');
    void rankingDrawer.offsetWidth;
  } else {
    rankingDrawer.classList.add('feed-drawer--closing');
    drawerCloseTimer = setTimeout(() => {
      rankingDrawer.hidden = true;
      rankingDrawerBackdrop.hidden = true;
      rankingDrawer.classList.remove('feed-drawer--closing');
      drawerCloseTimer = null;
    }, 280);
  }

  rankingDrawer.setAttribute('aria-hidden', String(!isOpen));
  rankingMenuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen);
}

function setStatus(message, type) {
  rankingStatus.textContent = message;
  rankingStatus.className = type ? `form-message ${type}` : 'form-message feed-mobile-message';
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

function formatUpdatedAt(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function renderCurrentUser(user) {
  const userNameText = user && user.nome ? user.nome : 'Ranking';
  const userRoleText = user
    ? `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`
    : 'Acesso restrito ao time administrativo.';

  rankingUserName.textContent = userNameText;
  rankingUserRole.textContent = userRoleText;
  rankingDrawerUserName.textContent = userNameText;
  rankingDrawerUserRole.textContent = userRoleText;
}

function buildRankingCard(user) {
  const card = document.createElement('article');
  card.className = 'profile-section-card';

  const header = document.createElement('div');
  header.className = 'profile-section-header';

  const heading = document.createElement('div');

  const kicker = document.createElement('p');
  kicker.className = 'profile-section-kicker';
  kicker.textContent = `Posicao ${user.rankingPosition}`;
  heading.appendChild(kicker);

  const title = document.createElement('h2');
  title.className = 'profile-section-title';
  title.textContent = user.nome || 'Usuario sem nome';
  heading.appendChild(title);

  const copy = document.createElement('p');
  copy.className = 'linktree-card-copy';
  const baseCopy = `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`;
  copy.textContent = currentUser && user._id === currentUser._id ? `${baseCopy} · Voce` : baseCopy;
  heading.appendChild(copy);

  const badge = document.createElement('strong');
  badge.className = 'profile-id-badge';
  badge.textContent = user.id_magalu || '-';

  header.appendChild(heading);
  header.appendChild(badge);

  const details = document.createElement('dl');
  details.className = 'profile-detail-list';

  const pointRow = document.createElement('div');
  pointRow.innerHTML = `<dt>Pontos</dt><dd>${Number(user.pontos || 0)}</dd>`;
  details.appendChild(pointRow);

  const checkinRow = document.createElement('div');
  checkinRow.innerHTML = `<dt>Check-ins</dt><dd>${Number(user.totalCheckins || 0)}</dd>`;
  details.appendChild(checkinRow);

  const timeRow = document.createElement('div');
  timeRow.innerHTML = `<dt>Tempo</dt><dd>${formatDuration(user.tempo || 0)}</dd>`;
  details.appendChild(timeRow);

  card.appendChild(header);
  card.appendChild(details);
  return card;
}

function renderRanking(users) {
  rankingList.innerHTML = '';

  if (!Array.isArray(users) || users.length === 0) {
    rankingParticipants.textContent = '0';
    rankingLeaderScore.textContent = '0';
    setStatus('Nenhuma pontuacao encontrada para montar o ranking.', 'info-message');
    return;
  }

  rankingParticipants.textContent = String(users.length);
  rankingLeaderScore.textContent = String(Number(users[0].pontos || 0));
  rankingUpdatedAt.textContent = `Atualizado em ${formatUpdatedAt(new Date())}`;

  users.forEach((user, index) => {
    const displayUser = { ...user, rankingPosition: index + 1 };
    rankingList.appendChild(buildRankingCard(displayUser));
  });

  setStatus(`${users.length} participantes carregados.`, 'success');
}

function populateDiretoriaFilter(users) {
  const diretorias = [...new Set(
    users.map((u) => u.diretoria).filter(Boolean)
  )].sort();

  const currentValue = rankingDiretoriaFilter.value;
  rankingDiretoriaFilter.innerHTML = '<option value="">Geral (todas)</option>';

  diretorias.forEach((d) => {
    const option = document.createElement('option');
    option.value = d;
    option.textContent = d;
    rankingDiretoriaFilter.appendChild(option);
  });

  if (currentValue && diretorias.includes(currentValue)) {
    rankingDiretoriaFilter.value = currentValue;
  }
}

function applyDiretoriaFilter() {
  const selected = rankingDiretoriaFilter.value;
  const filtered = selected
    ? fullRankingData.filter((u) => u.diretoria === selected)
    : fullRankingData;

  renderRanking(filtered);
}

async function loadRanking() {
  setStatus('Carregando ranking...', 'info-message');
  rankingRefreshButton.disabled = true;
  rankingRefreshButton.textContent = 'Atualizando...';

  try {
    if (currentUser && currentUser._id) {
      const refreshedUser = await window.magaluApi.fetchUserById(currentUser._id);

      if (refreshedUser) {
        currentUser = refreshedUser;
        window.magaluApi.storeUser(refreshedUser);
      }
    }

    renderCurrentUser(currentUser);

    const rankingUrl = new URL(window.magaluApi.buildApiUrl('/api/users'), window.location.origin);
    rankingUrl.searchParams.set('view', 'ranking');
    rankingUrl.searchParams.set('limit', '200');

    const response = await fetch(
      rankingUrl.toString(),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok || !Array.isArray(data)) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar o ranking.');
    }

    fullRankingData = data;
    populateDiretoriaFilter(data);
    applyDiretoriaFilter();
  } catch (error) {
    rankingList.innerHTML = '';
    rankingParticipants.textContent = '0';
    rankingLeaderScore.textContent = '0';
    rankingUpdatedAt.textContent = 'Atualizacao indisponivel';
    setStatus(error.message || 'Nao foi possivel carregar o ranking.', 'error');
  } finally {
    rankingRefreshButton.disabled = false;
    rankingRefreshButton.textContent = 'Atualizar';
  }
}

setDrawerState(false);

if (!currentUser) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(currentUser)) {
  redirectToFirstAccess();
} else if (!window.magaluApi.canAccessRanking(currentUser)) {
  window.location.replace(window.magaluApi.buildAppUrl('/perfil/'));
} else {
  renderCurrentUser(currentUser);
  loadRanking();
}

rankingRefreshButton.addEventListener('click', () => {
  loadRanking();
});

rankingDiretoriaFilter.addEventListener('change', () => {
  applyDiretoriaFilter();
});

rankingMenuButton.addEventListener('click', () => {
  setDrawerState(true);
});

rankingCloseDrawerButton.addEventListener('click', () => {
  setDrawerState(false);
});

rankingDrawerBackdrop.addEventListener('click', () => {
  setDrawerState(false);
});

rankingLogoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !rankingDrawer.hidden) {
    setDrawerState(false);
  }
});
