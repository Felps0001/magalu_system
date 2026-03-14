const logisticaUserName = document.getElementById('logistica-user-name');
const logisticaUserRole = document.getElementById('logistica-user-role');
const drawerUserName = document.getElementById('logistica-drawer-user-name');
const drawerUserRole = document.getElementById('logistica-drawer-user-role');
const transferValue = document.getElementById('logistica-transfer');
const hospedagemValue = document.getElementById('logistica-hospedagem');
const aereoValue = document.getElementById('logistica-aereo');
const menuButton = document.getElementById('logistica-menu-button');
const drawer = document.getElementById('logistica-drawer');
const drawerBackdrop = document.getElementById('logistica-drawer-backdrop');
const closeDrawerButton = document.getElementById('logistica-close-drawer');
const openQrCodeMenuButton = document.getElementById('logistica-open-qrcode-menu');
const qrCodeModal = document.getElementById('logistica-qrcode-modal');
const qrCodeBackdrop = document.getElementById('logistica-qrcode-backdrop');
const closeQrCodeButton = document.getElementById('logistica-close-qrcode');
const closeQrCodeSecondaryButton = document.getElementById('logistica-close-qrcode-secondary');
const generateQrCodeButton = document.getElementById('logistica-generate-qrcode-button');
const qrCodePreview = document.getElementById('logistica-qrcode-preview');
const logoutButton = document.getElementById('logout-button');
const sectionLinks = {
  transfer: document.getElementById('logistica-link-transfer'),
  hospedagem: document.getElementById('logistica-link-hospedagem'),
  aereo: document.getElementById('logistica-link-aereo'),
};

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

function highlightCurrentSection() {
  const activeHash = window.location.hash.replace('#', '') || 'transfer';

  Object.entries(sectionLinks).forEach(([key, link]) => {
    if (!link) {
      return;
    }

    const isCurrent = key === activeHash;
    link.classList.toggle('feed-drawer-sublink--current', isCurrent);

    if (isCurrent) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

setDrawerState(false);
setQrModalState(false);

const user = window.magaluApi.readStoredUser();

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.loja || 'Sem loja'}`;

  logisticaUserName.textContent = userNameText;
  logisticaUserRole.textContent = 'Informacoes da sua viagem e estadia no evento.';
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  transferValue.textContent = user.transfer ? 'Sim' : 'Nao';
  hospedagemValue.textContent = user.hospedagem || 'Nao informado.';
  aereoValue.textContent = user.aereo || 'Nao informado.';
}

highlightCurrentSection();

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

window.addEventListener('hashchange', () => {
  highlightCurrentSection();
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