const linktreeUserName = document.getElementById('linktree-user-name');
const linktreeUserRole = document.getElementById('linktree-user-role');
const drawerUserName = document.getElementById('linktree-drawer-user-name');
const drawerUserRole = document.getElementById('linktree-drawer-user-role');
const menuButton = document.getElementById('linktree-menu-button');
const drawer = document.getElementById('linktree-drawer');
const drawerBackdrop = document.getElementById('linktree-drawer-backdrop');
const closeDrawerButton = document.getElementById('linktree-close-drawer');
const openQrCodeMenuButton = document.getElementById('linktree-open-qrcode-menu');
const qrCodeModal = document.getElementById('linktree-qrcode-modal');
const qrCodeBackdrop = document.getElementById('linktree-qrcode-backdrop');
const closeQrCodeButton = document.getElementById('linktree-close-qrcode');
const closeQrCodeSecondaryButton = document.getElementById('linktree-close-qrcode-secondary');
const generateQrCodeButton = document.getElementById('linktree-generate-qrcode-button');
const qrCodePreview = document.getElementById('linktree-qrcode-preview');
const openQrCodeCardButton = document.getElementById('linktree-open-qrcode-card');

let currentUser = null;
let qrCodeLoaded = false;

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
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

setDrawerState(false);
setQrModalState(false);

const storedUser = window.magaluApi.readStoredUser();

if (storedUser) {
  currentUser = storedUser;
  const userNameText = storedUser.nome || 'Usuario';
  const userRoleText = `${storedUser.cargo || 'Sem cargo'} · ${storedUser.loja || 'Sem loja'}`;

  linktreeUserName.textContent = userNameText;
  linktreeUserRole.textContent = 'Atalhos rapidos para navegar por todas as telas do projeto.';
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
}

generateQrCodeButton.addEventListener('click', () => {
  loadUserQrCode();
});

openQrCodeMenuButton.addEventListener('click', () => {
  openQrCodeModal();
});

openQrCodeCardButton.addEventListener('click', () => {
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