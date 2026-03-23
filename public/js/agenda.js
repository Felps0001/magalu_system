const turmaSections = Array.from(document.querySelectorAll('[data-turma]'));
const publicAgendaSections = Array.from(document.querySelectorAll('[data-agenda-publica="true"]'));
const logoutButton = document.getElementById('logout-button');
const agendaUserName = document.getElementById('agenda-user-name');
const agendaUserRole = document.getElementById('agenda-user-role');
const drawerUserName = document.getElementById('agenda-drawer-user-name');
const drawerUserRole = document.getElementById('agenda-drawer-user-role');
const menuButton = document.getElementById('agenda-menu-button');
const drawer = document.getElementById('agenda-drawer');
const drawerBackdrop = document.getElementById('agenda-drawer-backdrop');
const closeDrawerButton = document.getElementById('agenda-close-drawer');
const openScannerMenuButton = document.getElementById('agenda-open-scanner-menu');
const openKitCodeMenuButton = document.getElementById('agenda-open-kit-code-menu');
const openScannerButton = document.getElementById('agenda-open-scanner');
const scannerModal = document.getElementById('agenda-scanner-modal');
const scannerBackdrop = document.getElementById('agenda-scanner-backdrop');
const closeScannerButton = document.getElementById('agenda-close-scanner');
const startScanButton = document.getElementById('agenda-start-scan-button');
const stopScanButton = document.getElementById('agenda-stop-scan-button');
const scannerPreview = document.getElementById('agenda-scanner-preview');
const scannerStatus = document.getElementById('agenda-scanner-status');
const scannerResult = document.getElementById('agenda-scanner-result');
const kitCodeModal = document.getElementById('agenda-kit-code-modal');
const kitCodeBackdrop = document.getElementById('agenda-kit-code-backdrop');
const closeKitCodeButton = document.getElementById('agenda-close-kit-code');
const closeKitCodeSecondaryButton = document.getElementById('agenda-close-kit-code-secondary');
const generateKitCodeButton = document.getElementById('agenda-generate-kit-code-button');
const kitCodePreview = document.getElementById('agenda-kit-code-preview');

let currentUser = null;
let kitCodeLoaded = false;
let html5QrCode = null;
let lastDecodedValue = '';
let isHandlingScan = false;
let drawerCloseTimer = null;

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
  document.body.classList.toggle('feed-ui-lock', isOpen || !kitCodeModal.hidden || !scannerModal.hidden);
}

function setKitCodeModalState(isOpen) {
  kitCodeModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !scannerModal.hidden);
}

function setScannerModalState(isOpen) {
  scannerModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !kitCodeModal.hidden);
}

function setScannerStatus(message, type) {
  scannerStatus.textContent = message;
  scannerStatus.className = `form-message ${type}`;
}

function updateScannerResult(value) {
  scannerResult.textContent = value || 'Nenhum codigo lido.';
}

function setKitActionVisibility(isVisible) {
  openKitCodeMenuButton.hidden = !isVisible;

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

function normalizeTurma(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/^TURMA\s+/, '');
}

function setSectionVisibility(section, visible) {
  section.hidden = !visible;
  section.style.display = visible ? 'grid' : 'none';
}

function renderKitCode(responseData) {
  kitCodePreview.innerHTML = responseData.qrCodeSvg;
  kitCodeLoaded = true;
}

function renderKitCodePlaceholder(message) {
  kitCodePreview.innerHTML = `<p class="muted">${message}</p>`;
  kitCodeLoaded = false;
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

async function stopScanner() {
  isHandlingScan = false;

  if (!html5QrCode) {
    startScanButton.disabled = false;
    stopScanButton.disabled = true;
    scannerPreview.classList.remove('scanner-active');
    return;
  }

  try {
    if (html5QrCode.isScanning) {
      await html5QrCode.stop();
    }
  } catch (error) {
    console.error('Falha ao parar scanner:', error);
  }

  try {
    await html5QrCode.clear();
  } catch (error) {
    console.error('Falha ao limpar scanner:', error);
  }

  startScanButton.disabled = false;
  stopScanButton.disabled = true;
  scannerPreview.classList.remove('scanner-active');
}

async function startScanner() {
  if (!window.Html5Qrcode) {
    setScannerStatus('A biblioteca do scanner nao foi carregada corretamente.', 'error');
    return;
  }

  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    setScannerStatus('Use HTTPS ou localhost.', 'error');
    return;
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('agenda-scanner-mount');
    }

    startScanButton.disabled = true;
    stopScanButton.disabled = false;
    isHandlingScan = false;
    lastDecodedValue = '';
    updateScannerResult('Nenhum QR lido.');
    setScannerStatus('Abrindo camera...', 'info-message');

    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      },
      async (decodedText) => {
        if (!decodedText || decodedText === lastDecodedValue || isHandlingScan) {
          return;
        }

        lastDecodedValue = decodedText;
        updateScannerResult(decodedText);
        const destinationUrl = window.magaluApi.resolveQrNavigationUrl(decodedText);

        if (!destinationUrl) {
          setScannerStatus('QR lido sem rota valida.', 'error');
          return;
        }

        isHandlingScan = true;
        setScannerStatus('QR lido. Redirecionando...', 'success');

        if (navigator.vibrate) {
          navigator.vibrate(120);
        }

        await closeScannerModal();
        window.location.assign(destinationUrl);
      },
      () => {
      }
    );

    scannerPreview.classList.add('scanner-active');
    setScannerStatus('Camera ativa. Aponte para o QR.', 'info-message');
  } catch (error) {
    startScanButton.disabled = false;
    stopScanButton.disabled = true;
    scannerPreview.classList.remove('scanner-active');

    if (error && String(error).toLowerCase().includes('permission')) {
      setScannerStatus('Acesso a camera negado.', 'error');
      return;
    }

    setScannerStatus('Camera indisponivel neste aparelho.', 'error');
    console.error(error);
  }
}

async function closeScannerModal() {
  await stopScanner();
  setScannerModalState(false);
}

function renderAgendaForTurma(turma) {
  const turmaNormalizada = normalizeTurma(turma);
  let encontrouTurma = false;

  publicAgendaSections.forEach((section) => {
    setSectionVisibility(section, true);
  });

  turmaSections.forEach((section) => {
    const turmaDaSection = normalizeTurma(section.dataset.turma);
    const deveMostrar = !turmaNormalizada || turmaDaSection === turmaNormalizada;

    setSectionVisibility(section, deveMostrar);

    if (deveMostrar) {
      encontrouTurma = true;
    }
  });

  if (!turmaNormalizada) {
    agendaUserName.textContent = 'Agenda geral do evento';
    agendaUserRole.textContent = 'Exibindo a agenda aberta do dia e a programacao geral do evento.';
    return;
  }

  if (!encontrouTurma) {
    agendaUserName.textContent = 'Agenda indisponivel';
    agendaUserRole.textContent = 'Nenhum bloco de agenda foi configurado para este acesso.';
    return;
  }

  agendaUserName.textContent = `Agenda segmentada ${turma}`;
  agendaUserRole.textContent = 'Exibindo a agenda aberta do dia junto do bloco correspondente a este acesso.';
}

const user = window.magaluApi.readStoredUser();

setDrawerState(false);
setKitCodeModalState(false);
setScannerModalState(false);

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`;
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  renderAgendaForTurma(user.turma || user.Turma || '');
  syncKitActionVisibility();
}

generateKitCodeButton.addEventListener('click', () => {
  loadUserKitCode();
});

openScannerMenuButton.addEventListener('click', () => {
  setDrawerState(false);
  setScannerModalState(true);
  setScannerStatus('Pronto para escanear.', 'info-message');
  updateScannerResult('Nenhum QR lido.');
});

openKitCodeMenuButton.addEventListener('click', () => {
  openKitCodeModal();
});

openScannerButton.addEventListener('click', () => {
  setScannerModalState(true);
  setScannerStatus('Pronto para escanear.', 'info-message');
  updateScannerResult('Nenhum QR lido.');
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

scannerBackdrop.addEventListener('click', async () => {
  await closeScannerModal();
});

closeScannerButton.addEventListener('click', async () => {
  await closeScannerModal();
});

startScanButton.addEventListener('click', () => {
  startScanner();
});

stopScanButton.addEventListener('click', async () => {
  await stopScanner();
  setScannerStatus('Camera encerrada.', 'info-message');
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

window.addEventListener('beforeunload', () => {
  stopScanner();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    stopScanner();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (!scannerModal.hidden) {
    closeScannerModal();
  }

  if (!kitCodeModal.hidden) {
    setKitCodeModalState(false);
  }

  if (!drawer.hidden) {
    setDrawerState(false);
  }
});