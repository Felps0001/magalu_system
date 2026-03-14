const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const drawerUserName = document.getElementById('profile-drawer-user-name');
const drawerUserRole = document.getElementById('profile-drawer-user-role');
const userIdMagalu = document.getElementById('user-id-magalu');
const userPontos = document.getElementById('user-pontos');
const userCheckins = document.getElementById('user-checkins');
const userEstandesCount = document.getElementById('user-estandes-count');
const userCpf = document.getElementById('user-cpf');
const userCargo = document.getElementById('user-cargo');
const userRegiao = document.getElementById('user-regiao');
const userCidade = document.getElementById('user-cidade');
const userLoja = document.getElementById('user-loja');
const userTurma = document.getElementById('user-turma');
const userTransfer = document.getElementById('user-transfer');
const estandesList = document.getElementById('estandes-list');
const generateQrCodeButton = document.getElementById('generate-qrcode-button');
const qrCodeModal = document.getElementById('profile-qrcode-modal');
const qrCodeBackdrop = document.getElementById('profile-qrcode-backdrop');
const closeQrCodeButton = document.getElementById('profile-close-qrcode');
const closeQrCodeSecondaryButton = document.getElementById('profile-close-qrcode-secondary');
const qrCodePreview = document.getElementById('qrcode-preview');
const menuButton = document.getElementById('profile-menu-button');
const openQrCodeMenuButton = document.getElementById('open-qrcode-menu');
const openScannerButton = document.getElementById('profile-open-scanner');
const scannerModal = document.getElementById('profile-scanner-modal');
const scannerBackdrop = document.getElementById('profile-scanner-backdrop');
const closeScannerButton = document.getElementById('profile-close-scanner');
const startScanButton = document.getElementById('start-scan-button');
const stopScanButton = document.getElementById('stop-scan-button');
const scannerPreview = document.getElementById('scanner-preview');
const scannerMount = document.getElementById('scanner-mount');
const scannerStatus = document.getElementById('scanner-status');
const scannerResult = document.getElementById('scanner-result');
const drawer = document.getElementById('profile-drawer');
const drawerBackdrop = document.getElementById('profile-drawer-backdrop');
const closeDrawerButton = document.getElementById('profile-close-drawer');
const logoutButton = document.getElementById('logout-button');

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

setDrawerState(false);
setQrModalState(false);
setScannerModalState(false);

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
    successMessage = 'QR Code carregado com sucesso.',
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
    generateQrCodeButton.textContent = 'QR Code carregado';
  } catch (error) {
    renderQrPlaceholder('O QR Code nao foi carregado.');
  } finally {
    generateQrCodeButton.disabled = false;
    generateQrCodeButton.textContent = 'Atualizar QR Code';
  }
}

function renderVisitedStands(estandesVisitados) {
  estandesList.innerHTML = '';

  if (!Array.isArray(estandesVisitados) || estandesVisitados.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'profile-estandes-empty';
    emptyItem.textContent = 'Nenhum estande visitado ainda.';
    estandesList.appendChild(emptyItem);
    return;
  }

  estandesVisitados.forEach((estande) => {
    const item = document.createElement('li');
    item.className = 'profile-estandes-item';

    const standName = document.createElement('strong');
    standName.textContent = estande.nome || 'Estande sem nome';

    const standMeta = document.createElement('span');
    standMeta.textContent = estande.codigo ? `Codigo ${estande.codigo}` : 'Check-in registrado';

    item.appendChild(standName);
    item.appendChild(standMeta);
    estandesList.appendChild(item);
  });
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
    successMessage: 'QR Code carregado com sucesso.',
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
      html5QrCode = new Html5Qrcode('scanner-mount');
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
        // Ignora erros por frame para manter a leitura contínua.
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

const user = window.magaluApi.readStoredUser();

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.loja || 'Sem loja'}`;
  const visitedStands = Array.isArray(user.estandesVisitados) ? user.estandesVisitados : [];

  userName.textContent = userNameText;
  userRole.textContent = userRoleText;
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  userIdMagalu.textContent = user.id_magalu || '-';
  userPontos.textContent = String(user.pontos || 0);
  userCheckins.textContent = String(user.totalCheckins || 0);
  userEstandesCount.textContent = String(visitedStands.length);
  userCpf.textContent = user.cpf || '-';
  userCargo.textContent = user.cargo || '-';
  userRegiao.textContent = user.regiao || '-';
  userCidade.textContent = user.cidade || '-';
  userLoja.textContent = user.loja || '-';
  userTurma.textContent = user.turma || '-';
  userTransfer.textContent = user.transfer ? 'Sim' : 'Nao';
  renderVisitedStands(visitedStands);
}

generateQrCodeButton.addEventListener('click', () => {
  loadUserQrCode();
});

openScannerButton.addEventListener('click', () => {
  setScannerModalState(true);
  setScannerStatus('Aguardando inicialização...', 'info-message');
  updateScannerResult('Nenhum QR Code lido ainda.');
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