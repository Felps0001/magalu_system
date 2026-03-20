const linktreeUserName = document.getElementById('linktree-user-name');
const linktreeUserRole = document.getElementById('linktree-user-role');
const drawerUserName = document.getElementById('linktree-drawer-user-name');
const drawerUserRole = document.getElementById('linktree-drawer-user-role');
const menuButton = document.getElementById('linktree-menu-button');
const drawer = document.getElementById('linktree-drawer');
const drawerBackdrop = document.getElementById('linktree-drawer-backdrop');
const closeDrawerButton = document.getElementById('linktree-close-drawer');
const openKitCodeMenuButton = document.getElementById('linktree-open-kit-code-menu');
const kitCodeModal = document.getElementById('linktree-kit-code-modal');
const kitCodeBackdrop = document.getElementById('linktree-kit-code-backdrop');
const closeKitCodeButton = document.getElementById('linktree-close-kit-code');
const closeKitCodeSecondaryButton = document.getElementById('linktree-close-kit-code-secondary');
const generateKitCodeButton = document.getElementById('linktree-generate-kit-code-button');
const kitCodePreview = document.getElementById('linktree-kit-code-preview');
const openKitCodeCardButton = document.getElementById('linktree-open-kit-code-card');

let currentUser = null;
let kitCodeLoaded = false;
let drawerCloseTimer = null;

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function setDrawerState(isOpen) {
  if (drawerCloseTimer) {
    clearTimeout(drawerCloseTimer);
    drawerCloseTimer = null;
  }

  if (isOpen) {
    drawer.hidden = false;
    drawerBackdrop.hidden = false;
    drawer.classList.remove('feed-drawer--closing');
    void drawer.offsetWidth;
  } else {
    drawer.classList.add('feed-drawer--closing');
    drawerCloseTimer = setTimeout(() => {
      drawer.hidden = true;
      drawerBackdrop.hidden = true;
      drawer.classList.remove('feed-drawer--closing');
      drawerCloseTimer = null;
    }, 280);
  }

  drawer.setAttribute('aria-hidden', String(!isOpen));
  menuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen || !kitCodeModal.hidden);
}

function setKitCodeModalState(isOpen) {
  kitCodeModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden);
}

function renderKitCode(responseData) {
  kitCodePreview.innerHTML = responseData.qrCodeSvg;
  kitCodeLoaded = true;
}

function renderKitCodePlaceholder(message) {
  kitCodePreview.innerHTML = `<p class="muted">${message}</p>`;
  kitCodeLoaded = false;
}

function setKitActionVisibility(isVisible) {
  openKitCodeMenuButton.hidden = !isVisible;

  if (openKitCodeCardButton) {
    openKitCodeCardButton.hidden = !isVisible;
  }

  if (!isVisible && !kitCodeModal.hidden) {
    setKitCodeModalState(false);
  }
}

async function syncKitActionVisibility() {
  setKitActionVisibility(window.magaluApi.hasPendingKit(currentUser));

  if (!currentUser || !currentUser._id) {
    return;
  }

  const kitStatus = await window.magaluApi.fetchUserKitStatus(currentUser._id);

  if (!kitStatus) {
    return;
  }

  currentUser = window.magaluApi.mergeUserKitStatus(currentUser, kitStatus);
  window.magaluApi.storeUser(currentUser);
  setKitActionVisibility(window.magaluApi.hasPendingKit(currentUser));
}

function getKitCodeRequestError(data) {
  if (data && typeof data.error === 'string' && !data.error.includes('<!DOCTYPE')) {
    return data.error;
  }

  const rawText = data && typeof data.rawText === 'string' ? data.rawText : '';

  if (rawText.includes('Cannot GET') && rawText.includes('/qrcode')) {
    return 'O backend em uso ainda nao possui a rota do codigo. Reinicie o servidor local ou publique a versao nova do backend.';
  }

  return 'O backend retornou uma resposta invalida ao gerar o codigo.';
}

async function loadUserKitCode(options = {}) {
  const {
    buttonLoadingLabel = 'Gerando...',
    loadingMessage = 'Carregando QR...',
  } = options;

  if (!currentUser || !currentUser._id) {
    renderKitCodePlaceholder('Usuario nao encontrado para gerar o codigo.');
    return;
  }

  generateKitCodeButton.disabled = true;
  generateKitCodeButton.textContent = buttonLoadingLabel;
  renderKitCodePlaceholder(loadingMessage);

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/users/${encodeURIComponent(currentUser._id)}/qrcode`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getKitCodeRequestError(data));
    }

    renderKitCode(data);
    currentUser = {
      ...currentUser,
      qrCodeGeneratedAt: data.qrCodeGeneratedAt,
      qrCodePayload: data.qrCodePayload,
    };
    window.magaluApi.storeUser(currentUser);
  } catch (error) {
    renderKitCodePlaceholder('O codigo nao foi carregado.');
  } finally {
    generateKitCodeButton.disabled = false;
    generateKitCodeButton.textContent = 'Atualizar codigo';
  }
}

async function openKitCodeModal() {
  setDrawerState(false);
  setKitCodeModalState(true);

  if (kitCodeLoaded) {
    return;
  }

  await loadUserKitCode({
    buttonLoadingLabel: 'Carregando...',
    loadingMessage: 'Carregando QR...',
  });
}

setDrawerState(false);
setKitCodeModalState(false);

const storedUser = window.magaluApi.readStoredUser();

if (storedUser) {
  currentUser = storedUser;
  const userNameText = storedUser.nome || 'Usuario';
  const userRoleText = `${storedUser.cargo || 'Sem cargo'} · ${storedUser.filial || 'Sem filial'}`;

  linktreeUserName.textContent = userNameText;
  linktreeUserRole.textContent = 'Atalhos rapidos para navegar por todas as telas do projeto.';
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  syncKitActionVisibility();
}

generateKitCodeButton.addEventListener('click', () => {
  loadUserKitCode();
});

openKitCodeMenuButton.addEventListener('click', () => {
  openKitCodeModal();
});

openKitCodeCardButton.addEventListener('click', () => {
  openKitCodeModal();
});

kitCodeBackdrop.addEventListener('click', () => {
  setKitCodeModalState(false);
});

closeKitCodeButton.addEventListener('click', () => {
  setKitCodeModalState(false);
});

closeKitCodeSecondaryButton.addEventListener('click', () => {
  setKitCodeModalState(false);
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

  if (!kitCodeModal.hidden) {
    setKitCodeModalState(false);
  }

  if (!drawer.hidden) {
    setDrawerState(false);
  }
});