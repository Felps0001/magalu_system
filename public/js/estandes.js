const estandesUserName = document.getElementById('estandes-user-name');
const estandesUserRole = document.getElementById('estandes-user-role');
const drawerUserName = document.getElementById('estandes-drawer-user-name');
const drawerUserRole = document.getElementById('estandes-drawer-user-role');
const visitedCount = document.getElementById('estandes-visited-count');
const summaryCopy = document.getElementById('estandes-summary-copy');
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

    const media = document.createElement('div');
    media.className = 'estande-card-media';

    const image = document.createElement('img');
    image.className = `estande-card-image${isVisited ? ' estande-card-image--checked' : ''}`;
    image.src = '../assets/img/checkin-magalu.png';
    image.alt = isVisited
      ? `Check-in realizado no estande ${estande.nome || 'Magalu'}`
      : `Check-in pendente no estande ${estande.nome || 'Magalu'}`;

    media.appendChild(image);

    const body = document.createElement('div');
    body.className = 'estande-card-body';

    const badge = document.createElement('span');
    badge.className = `estande-card-badge${isVisited ? ' estande-card-badge--checked' : ''}`;
    badge.textContent = isVisited ? 'Check-in realizado' : 'Aguardando check-in';

    const title = document.createElement('strong');
    title.className = 'estande-card-title';
    title.textContent = estande.nome || 'Estande sem nome';

    const copy = document.createElement('p');
    copy.className = 'estande-card-copy';
    copy.textContent = isVisited
      ? 'Seu acesso neste estande ja foi registrado e o card foi liberado em cor.'
      : 'Quando o check-in for registrado, este card sai do preto e branco automaticamente.';

    body.appendChild(badge);
    body.appendChild(title);
    body.appendChild(copy);

    card.appendChild(media);
    card.appendChild(body);
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

    visitedCount.textContent = `${visitedCountValue} visitados`;
    summaryCopy.textContent = visitedCountValue > 0
      ? `Voce ja registrou check-in em ${visitedCountValue} ${visitedCountValue === 1 ? 'estande' : 'estandes'}.`
      : 'Voce ainda nao registrou check-in em nenhum estande.';
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
  estandesUserRole.textContent = 'Seus estandes com check-in aparecem em destaque nesta lista.';
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