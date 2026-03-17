const estandesUserName = document.getElementById('estandes-user-name');
const drawerUserName = document.getElementById('estandes-drawer-user-name');
const drawerUserRole = document.getElementById('estandes-drawer-user-role');
const visitedCount = document.getElementById('estandes-visited-count');
const statusMessage = document.getElementById('estandes-status');
const estandesList = document.getElementById('estandes-list');
const menuButton = document.getElementById('estandes-menu-button');
const drawer = document.getElementById('estandes-drawer');
const drawerBackdrop = document.getElementById('estandes-drawer-backdrop');
const closeDrawerButton = document.getElementById('estandes-close-drawer');
const openQrCodeMenuButton = document.getElementById('estandes-open-qrcode-menu');
const logoutButton = document.getElementById('logout-button');
const qrCodeModal = document.getElementById('estandes-qrcode-modal');
const qrCodeBackdrop = document.getElementById('estandes-qrcode-backdrop');
const closeQrCodeButton = document.getElementById('estandes-close-qrcode');
const closeQrCodeSecondaryButton = document.getElementById('estandes-close-qrcode-secondary');
const generateQrCodeButton = document.getElementById('estandes-generate-qrcode-button');
const qrCodePreview = document.getElementById('estandes-qrcode-preview');

let currentUser = null;
let qrCodeLoaded = false;

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToFirstAccess() {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setDrawerState(isOpen) {
  drawer.hidden = !isOpen;
  drawerBackdrop.hidden = !isOpen;
  drawer.setAttribute('aria-hidden', String(!isOpen));
  menuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen || !qrCodeModal.hidden);
}

function setQrModalState(isOpen) {
  qrCodeModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden);
}

function renderQrCode(responseData) {
  qrCodePreview.innerHTML = responseData.qrCodeSvg;
  qrCodeLoaded = true;
}

function renderQrPlaceholder(message) {
  qrCodePreview.innerHTML = `<p class="muted">${message}</p>`;
  qrCodeLoaded = false;
}

function getQrCodeRequestError(data) {
  if (data && typeof data.error === 'string' && !data.error.includes('<!DOCTYPE')) {
    return data.error;
  }

  const rawText = data && typeof data.rawText === 'string' ? data.rawText : '';

  if (rawText.includes('Cannot GET') && rawText.includes('/qrcode')) {
    return 'O backend em uso ainda nao possui a rota de QR Code. Reinicie o servidor local ou publique a versao nova do backend.';
  }

  return 'O backend retornou uma resposta invalida ao gerar o QR Code.';
}

async function refreshStoredUser(userId) {
  const response = await fetch(window.magaluApi.buildApiUrl('/api/users'), window.magaluApi.withApiDefaults());

  if (!response.ok) {
    return null;
  }

  const users = await window.magaluApi.parseApiResponse(response);

  if (!Array.isArray(users)) {
    return null;
  }

  const updatedUser = users.find((item) => item && item._id === userId);

  if (updatedUser) {
    window.magaluApi.storeUser(updatedUser);
  }

  return updatedUser || null;
}

async function loadUserQrCode(options = {}) {
  const {
    buttonLoadingLabel = 'Gerando...',
    loadingMessage = 'Carregando QR Code do usuario...',
  } = options;

  if (!currentUser || !currentUser._id) {
    renderQrPlaceholder('Usuario nao encontrado para gerar o QR Code.');
    return;
  }

  generateQrCodeButton.disabled = true;
  generateQrCodeButton.textContent = buttonLoadingLabel;
  renderQrPlaceholder(loadingMessage);

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/users/${encodeURIComponent(currentUser._id)}/qrcode`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getQrCodeRequestError(data));
    }

    renderQrCode(data);
    currentUser = {
      ...currentUser,
      qrCodeGeneratedAt: data.qrCodeGeneratedAt,
      qrCodePayload: data.qrCodePayload,
    };
    window.magaluApi.storeUser(currentUser);
  } catch (error) {
    renderQrPlaceholder('O QR Code nao foi carregado.');
  } finally {
    generateQrCodeButton.disabled = false;
    generateQrCodeButton.textContent = 'Atualizar QR Code';
  }
}

async function openQrCodeModal() {
  setDrawerState(false);
  setQrModalState(true);

  if (qrCodeLoaded) {
    return;
  }

  await loadUserQrCode({
    buttonLoadingLabel: 'Carregando...',
    loadingMessage: 'Carregando o QR Code do seu perfil...',
  });
}

function getVisitedEstandeIds(user) {
  const visitedStands = Array.isArray(user && user.estandesVisitados) ? user.estandesVisitados : [];

  return new Set(
    visitedStands
      .map((estande) => {
        if (!estande) {
          return null;
        }

        if (typeof estande === 'string') {
          return estande;
        }

        return estande._id || estande.id || estande.estandeId || null;
      })
      .filter(Boolean)
      .map((value) => String(value))
  );
}

function createEmptyState(message) {
  const emptyCard = document.createElement('article');
  emptyCard.className = 'feed-mobile-card feed-mobile-card--empty';
  emptyCard.textContent = message;
  return emptyCard;
}

function getCompactMetric(estande) {
  const totalCheckins = Number(estande && estande.totalCheckins);

  if (Number.isFinite(totalCheckins) && totalCheckins > 0) {
    return `★ ${totalCheckins}`;
  }

  return '★ 0';
}

function renderEstandes(estandes, visitedIds) {
  estandesList.innerHTML = '';

  if (!Array.isArray(estandes) || estandes.length === 0) {
    estandesList.appendChild(createEmptyState('Nenhum estande cadastrado ainda.'));
    return;
  }

  const sortedEstandes = [...estandes].sort((first, second) => {
    const firstName = first && first.nome ? String(first.nome) : '';
    const secondName = second && second.nome ? String(second.nome) : '';
    return firstName.localeCompare(secondName, 'pt-BR', { sensitivity: 'base' });
  });

  sortedEstandes.forEach((estande) => {
    const isVisited = visitedIds.has(String(estande._id));
    const card = document.createElement('article');
    card.className = `estande-card${isVisited ? ' estande-card--checked' : ''}`;
    card.setAttribute('aria-label', `${estande.nome || 'Estande sem nome'}${isVisited ? ', visitado' : ', pendente'}`);

    const accent = document.createElement('span');
    accent.className = 'estande-card-accent';
    accent.setAttribute('aria-hidden', 'true');

    const title = document.createElement('strong');
    title.className = 'estande-card-title';
    title.textContent = estande.nome || 'Estande sem nome';

    const metric = document.createElement('span');
    metric.className = 'estande-card-metric';
    metric.textContent = getCompactMetric(estande);

    const status = document.createElement('span');
    status.className = `estande-card-status${isVisited ? ' estande-card-status--checked' : ''}`;
    status.setAttribute('role', 'img');
    status.setAttribute('aria-label', isVisited ? 'Check-in realizado' : 'Check-in pendente');

    card.appendChild(accent);
    card.appendChild(title);
    card.appendChild(metric);
    card.appendChild(status);
    estandesList.appendChild(card);
  });
}

async function loadEstandes(user) {
  statusMessage.className = 'form-message feed-mobile-message info-message';
  statusMessage.textContent = 'Carregando estandes...';

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/estandes'),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const estandes = await window.magaluApi.parseApiResponse(response);

    if (!response.ok || !Array.isArray(estandes)) {
      throw new Error('Nao foi possivel carregar os estandes.');
    }

    const visitedIds = getVisitedEstandeIds(user);
    const visitedCountValue = visitedIds.size;

    visitedCount.textContent = String(visitedCountValue);
    statusMessage.className = 'form-message feed-mobile-message';
    statusMessage.textContent = '';
    renderEstandes(estandes, visitedIds);
  } catch (error) {
    statusMessage.className = 'form-message feed-mobile-message error';
    statusMessage.textContent = 'Nao foi possivel carregar os estandes agora.';
    estandesList.innerHTML = '';
    estandesList.appendChild(createEmptyState('Tente novamente em instantes.'));
  }
}

setDrawerState(false);
setQrModalState(false);

async function initializeEstandesPage() {
  const storedUser = window.magaluApi.readStoredUser();

  if (!storedUser) {
    redirectToLogin();
    return;
  }

  if (window.magaluApi.requiresFirstAccess(storedUser)) {
    redirectToFirstAccess();
    return;
  }

  currentUser = storedUser._id
    ? (await refreshStoredUser(storedUser._id)) || storedUser
    : storedUser;

  const userNameText = currentUser.nome || 'Usuario';
  const userRoleText = `${currentUser.cargo || 'Sem cargo'} · ${currentUser.loja || 'Sem loja'}`;

  estandesUserName.textContent = userNameText;
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;

  await loadEstandes(currentUser);
}

generateQrCodeButton.addEventListener('click', () => {
  loadUserQrCode();
});

openQrCodeMenuButton.addEventListener('click', () => {
  openQrCodeModal();
});

qrCodeBackdrop.addEventListener('click', () => {
  setQrModalState(false);
});

closeQrCodeButton.addEventListener('click', () => {
  setQrModalState(false);
});

closeQrCodeSecondaryButton.addEventListener('click', () => {
  setQrModalState(false);
});

menuButton.addEventListener('click', () => {
  setDrawerState(true);
});

closeDrawerButton.addEventListener('click', () => {
  setDrawerState(false);
});

drawerBackdrop.addEventListener('click', () => {
  setDrawerState(false);
});

logoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (!qrCodeModal.hidden) {
    setQrModalState(false);
  }

  if (!drawer.hidden) {
    setDrawerState(false);
  }
});

initializeEstandesPage();