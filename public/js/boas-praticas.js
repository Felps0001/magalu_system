const boasPraticasUserName = document.getElementById('boas-praticas-user-name');
const boasPraticasDrawerUserName = document.getElementById('boas-praticas-drawer-user-name');
const boasPraticasDrawerUserRole = document.getElementById('boas-praticas-drawer-user-role');
const boasPraticasMenuButton = document.getElementById('boas-praticas-menu-button');
const boasPraticasDrawer = document.getElementById('boas-praticas-drawer');
const boasPraticasDrawerBackdrop = document.getElementById('boas-praticas-drawer-backdrop');
const boasPraticasCloseDrawerButton = document.getElementById('boas-praticas-close-drawer');
const boasPraticasOpenKitCodeMenuButton = document.getElementById('boas-praticas-open-kit-code-menu');
const boasPraticasOpenKitCodeCardButton = document.getElementById('boas-praticas-open-kit-code-card');
const boasPraticasKitCodeModal = document.getElementById('boas-praticas-kit-code-modal');
const boasPraticasKitCodeBackdrop = document.getElementById('boas-praticas-kit-code-backdrop');
const boasPraticasCloseKitCodeButton = document.getElementById('boas-praticas-close-kit-code');
const boasPraticasCloseKitCodeSecondaryButton = document.getElementById('boas-praticas-close-kit-code-secondary');
const boasPraticasGenerateKitCodeButton = document.getElementById('boas-praticas-generate-kit-code-button');
const boasPraticasKitCodePreview = document.getElementById('boas-praticas-kit-code-preview');

let boasPraticasCurrentUser = null;
let boasPraticasKitCodeLoaded = false;
let boasPraticasDrawerCloseTimer = null;

function setBoasPraticasDrawerState(isOpen) {
  if (boasPraticasDrawerCloseTimer) {
    clearTimeout(boasPraticasDrawerCloseTimer);
    boasPraticasDrawerCloseTimer = null;
  }

  if (isOpen) {
    boasPraticasDrawer.hidden = false;
    boasPraticasDrawerBackdrop.hidden = false;
    boasPraticasDrawer.classList.remove('feed-drawer--closing');
    void boasPraticasDrawer.offsetWidth;
  } else {
    boasPraticasDrawer.classList.add('feed-drawer--closing');
    boasPraticasDrawerCloseTimer = setTimeout(() => {
      boasPraticasDrawer.hidden = true;
      boasPraticasDrawerBackdrop.hidden = true;
      boasPraticasDrawer.classList.remove('feed-drawer--closing');
      boasPraticasDrawerCloseTimer = null;
    }, 280);
  }

  boasPraticasDrawer.setAttribute('aria-hidden', String(!isOpen));
  boasPraticasMenuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen || !boasPraticasKitCodeModal.hidden);
}

function setBoasPraticasKitCodeModalState(isOpen) {
  boasPraticasKitCodeModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !boasPraticasDrawer.hidden);
}

function renderBoasPraticasKitCode(responseData) {
  boasPraticasKitCodePreview.innerHTML = responseData.qrCodeSvg;
  boasPraticasKitCodeLoaded = true;
}

function renderBoasPraticasKitCodePlaceholder(message) {
  boasPraticasKitCodePreview.innerHTML = `<p class="muted">${message}</p>`;
  boasPraticasKitCodeLoaded = false;
}

function setBoasPraticasKitActionVisibility(isVisible) {
  boasPraticasOpenKitCodeMenuButton.hidden = !isVisible;
  boasPraticasOpenKitCodeCardButton.hidden = !isVisible;

  if (!isVisible && !boasPraticasKitCodeModal.hidden) {
    setBoasPraticasKitCodeModalState(false);
  }
}

async function syncBoasPraticasKitActionVisibility() {
  setBoasPraticasKitActionVisibility(window.magaluApi.hasPendingKit(boasPraticasCurrentUser));

  if (!boasPraticasCurrentUser || !boasPraticasCurrentUser._id) {
    return;
  }

  const kitStatus = await window.magaluApi.fetchUserKitStatus(boasPraticasCurrentUser._id);

  if (!kitStatus) {
    return;
  }

  boasPraticasCurrentUser = window.magaluApi.mergeUserKitStatus(boasPraticasCurrentUser, kitStatus);
  window.magaluApi.storeUser(boasPraticasCurrentUser);
  setBoasPraticasKitActionVisibility(window.magaluApi.hasPendingKit(boasPraticasCurrentUser));
}

function getBoasPraticasKitCodeRequestError(data) {
  if (data && typeof data.error === 'string' && !data.error.includes('<!DOCTYPE')) {
    return data.error;
  }

  const rawText = data && typeof data.rawText === 'string' ? data.rawText : '';

  if (rawText.includes('Cannot GET') && rawText.includes('/qrcode')) {
    return 'O backend em uso ainda não possui a rota do código. Reinicie o servidor local ou publique a versão nova do backend.';
  }

  return 'O backend retornou uma resposta inválida ao gerar o código.';
}

async function loadBoasPraticasKitCode(options = {}) {
  const {
    buttonLoadingLabel = 'Gerando...',
    loadingMessage = 'Carregando QR...',
  } = options;

  if (!boasPraticasCurrentUser || !boasPraticasCurrentUser._id) {
    renderBoasPraticasKitCodePlaceholder('Usuário não encontrado para gerar o código.');
    return;
  }

  boasPraticasGenerateKitCodeButton.disabled = true;
  boasPraticasGenerateKitCodeButton.textContent = buttonLoadingLabel;
  renderBoasPraticasKitCodePlaceholder(loadingMessage);

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/users/${encodeURIComponent(boasPraticasCurrentUser._id)}/qrcode`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getBoasPraticasKitCodeRequestError(data));
    }

    renderBoasPraticasKitCode(data);
    boasPraticasCurrentUser = {
      ...boasPraticasCurrentUser,
      qrCodeGeneratedAt: data.qrCodeGeneratedAt,
      qrCodePayload: data.qrCodePayload,
    };
    window.magaluApi.storeUser(boasPraticasCurrentUser);
  } catch (error) {
    renderBoasPraticasKitCodePlaceholder('O código não foi carregado.');
  } finally {
    boasPraticasGenerateKitCodeButton.disabled = false;
    boasPraticasGenerateKitCodeButton.textContent = 'Atualizar código';
  }
}

async function openBoasPraticasKitCodeModal() {
  setBoasPraticasDrawerState(false);
  setBoasPraticasKitCodeModalState(true);

  if (boasPraticasKitCodeLoaded) {
    return;
  }

  await loadBoasPraticasKitCode({
    buttonLoadingLabel: 'Carregando...',
    loadingMessage: 'Carregando QR...',
  });
}

setBoasPraticasDrawerState(false);
setBoasPraticasKitCodeModalState(false);

const boasPraticasStoredUser = window.magaluApi.readStoredUser();

if (boasPraticasStoredUser) {
  boasPraticasCurrentUser = boasPraticasStoredUser;
  const userNameText = boasPraticasStoredUser.nome || 'Usuário';
  const userRoleText = `${boasPraticasStoredUser.cargo || 'Sem cargo'} · ${boasPraticasStoredUser.filial || 'Sem filial'}`;

  boasPraticasUserName.textContent = userNameText;
  boasPraticasDrawerUserName.textContent = userNameText;
  boasPraticasDrawerUserRole.textContent = userRoleText;
  syncBoasPraticasKitActionVisibility();
}

boasPraticasGenerateKitCodeButton.addEventListener('click', () => {
  loadBoasPraticasKitCode();
});

boasPraticasOpenKitCodeMenuButton.addEventListener('click', () => {
  openBoasPraticasKitCodeModal();
});

boasPraticasOpenKitCodeCardButton.addEventListener('click', () => {
  openBoasPraticasKitCodeModal();
});

boasPraticasKitCodeBackdrop.addEventListener('click', () => {
  setBoasPraticasKitCodeModalState(false);
});

boasPraticasCloseKitCodeButton.addEventListener('click', () => {
  setBoasPraticasKitCodeModalState(false);
});

boasPraticasCloseKitCodeSecondaryButton.addEventListener('click', () => {
  setBoasPraticasKitCodeModalState(false);
});

boasPraticasMenuButton.addEventListener('click', () => {
  setBoasPraticasDrawerState(true);
});

boasPraticasCloseDrawerButton.addEventListener('click', () => {
  setBoasPraticasDrawerState(false);
});

boasPraticasDrawerBackdrop.addEventListener('click', () => {
  setBoasPraticasDrawerState(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (!boasPraticasKitCodeModal.hidden) {
    setBoasPraticasKitCodeModalState(false);
  }

  if (!boasPraticasDrawer.hidden) {
    setBoasPraticasDrawerState(false);
  }
});