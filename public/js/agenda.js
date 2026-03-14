const turmaSections = Array.from(document.querySelectorAll('[data-turma]'));
const logoutButton = document.getElementById('logout-button');
const agendaUserName = document.getElementById('agenda-user-name');
const agendaUserRole = document.getElementById('agenda-user-role');
const drawerUserName = document.getElementById('agenda-drawer-user-name');
const drawerUserRole = document.getElementById('agenda-drawer-user-role');
const menuButton = document.getElementById('agenda-menu-button');
const drawer = document.getElementById('agenda-drawer');
const drawerBackdrop = document.getElementById('agenda-drawer-backdrop');
const closeDrawerButton = document.getElementById('agenda-close-drawer');
const openQrCodeMenuButton = document.getElementById('agenda-open-qrcode-menu');
const openScannerButton = document.getElementById('agenda-open-scanner');
const scannerModal = document.getElementById('agenda-scanner-modal');
const scannerBackdrop = document.getElementById('agenda-scanner-backdrop');
const closeScannerButton = document.getElementById('agenda-close-scanner');
const startScanButton = document.getElementById('agenda-start-scan-button');
const stopScanButton = document.getElementById('agenda-stop-scan-button');
const scannerPreview = document.getElementById('agenda-scanner-preview');
const scannerStatus = document.getElementById('agenda-scanner-status');
const scannerResult = document.getElementById('agenda-scanner-result');
const qrCodeModal = document.getElementById('agenda-qrcode-modal');
const qrCodeBackdrop = document.getElementById('agenda-qrcode-backdrop');
const closeQrCodeButton = document.getElementById('agenda-close-qrcode');
const closeQrCodeSecondaryButton = document.getElementById('agenda-close-qrcode-secondary');
const generateQrCodeButton = document.getElementById('agenda-generate-qrcode-button');
const qrCodePreview = document.getElementById('agenda-qrcode-preview');

let currentUser = null;
let qrCodeLoaded = false;
let html5QrCode = null;
let lastDecodedValue = '';

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
  document.body.classList.toggle('feed-ui-lock', isOpen || !qrCodeModal.hidden || !scannerModal.hidden);
}

function setQrModalState(isOpen) {
  qrCodeModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !scannerModal.hidden);
}

function setScannerModalState(isOpen) {
  scannerModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !qrCodeModal.hidden);
}

function setScannerStatus(message, type) {
  scannerStatus.textContent = message;
  scannerStatus.className = `form-message ${type}`;
}

function updateScannerResult(value) {
  scannerResult.textContent = value || 'Nenhum QR Code lido ainda.';
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

async function stopScanner() {
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
    setScannerStatus('A camera so pode ser aberta em HTTPS ou localhost.', 'error');
    return;
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('agenda-scanner-mount');
    }

    startScanButton.disabled = true;
    stopScanButton.disabled = false;
    lastDecodedValue = '';
    updateScannerResult('Nenhum QR Code lido ainda.');
    setScannerStatus('Abrindo camera traseira...', 'info-message');

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
      (decodedText) => {
        if (!decodedText || decodedText === lastDecodedValue) {
          return;
        }

        lastDecodedValue = decodedText;
        updateScannerResult(decodedText);
        setScannerStatus('QR Code lido com sucesso.', 'success');

        if (navigator.vibrate) {
          navigator.vibrate(120);
        }
      },
      () => {
      }
    );

    scannerPreview.classList.add('scanner-active');
    setScannerStatus('Camera ativa. Aponte para um QR Code.', 'info-message');
  } catch (error) {
    startScanButton.disabled = false;
    stopScanButton.disabled = true;
    scannerPreview.classList.remove('scanner-active');

    if (error && String(error).toLowerCase().includes('permission')) {
      setScannerStatus('Permissao de camera negada. Libere o acesso e tente novamente.', 'error');
      return;
    }

    setScannerStatus('Nao foi possivel abrir a camera neste aparelho.', 'error');
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

  turmaSections.forEach((section) => {
    const turmaDaSection = normalizeTurma(section.dataset.turma);
    const deveMostrar = turmaDaSection === turmaNormalizada;

    setSectionVisibility(section, deveMostrar);

    if (deveMostrar) {
      encontrouTurma = true;
    }
  });

  if (!turmaNormalizada) {
    agendaUserName.textContent = 'Turma nao encontrada';
    agendaUserRole.textContent = 'Seu cadastro nao possui turma definida para liberar uma agenda especifica.';
    return;
  }

  if (!encontrouTurma) {
    agendaUserName.textContent = 'Agenda indisponivel';
    agendaUserRole.textContent = `Nenhuma agenda foi configurada para ${turma}.`;
    return;
  }

  agendaUserName.textContent = `Agenda liberada para ${turma}`;
  agendaUserRole.textContent = 'A agenda geral aparece para todos, e abaixo voce visualiza apenas os compromissos da sua turma.';
}

const user = window.magaluApi.readStoredUser();

setDrawerState(false);
setQrModalState(false);
setScannerModalState(false);

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.loja || 'Sem loja'}`;
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  renderAgendaForTurma(user.turma || user.Turma || '');
}

generateQrCodeButton.addEventListener('click', () => {
  loadUserQrCode();
});

openQrCodeMenuButton.addEventListener('click', () => {
  openQrCodeModal();
});

openScannerButton.addEventListener('click', () => {
  setScannerModalState(true);
  setScannerStatus('Aguardando inicialização...', 'info-message');
  updateScannerResult('Nenhum QR Code lido ainda.');
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

  if (!qrCodeModal.hidden) {
    setQrModalState(false);
  }

  if (!drawer.hidden) {
    setDrawerState(false);
  }
});