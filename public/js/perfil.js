const profilePageTitle = document.getElementById('profile-page-title');
const drawerUserName = document.getElementById('profile-drawer-user-name');
const drawerUserRole = document.getElementById('profile-drawer-user-role');
const userIdMagalu = document.getElementById('user-id-magalu');
const userPontos = document.getElementById('user-pontos');
const userCheckins = document.getElementById('user-checkins');
const userCpf = document.getElementById('user-cpf');
const userCargo = document.getElementById('user-cargo');
const userRegional = document.getElementById('user-regional');
const userFilial = document.getElementById('user-filial');
const userKitStatus = document.getElementById('user-kit-status');
const userAereo = document.getElementById('user-aereo');
const generateKitCodeButton = document.getElementById('generate-kit-code-button');
const kitCodeModal = document.getElementById('profile-kit-code-modal');
const kitCodeBackdrop = document.getElementById('profile-kit-code-backdrop');
const closeKitCodeButton = document.getElementById('profile-close-kit-code');
const closeKitCodeSecondaryButton = document.getElementById('profile-close-kit-code-secondary');
const kitCodePreview = document.getElementById('profile-kit-code-preview');
const menuButton = document.getElementById('profile-menu-button');
const openScannerMenuButton = document.getElementById('profile-open-scanner-menu');
const openKitCodeMenuButton = document.getElementById('profile-open-kit-code-menu');
const openScannerButton = document.getElementById('profile-open-scanner');
const scannerModal = document.getElementById('profile-scanner-modal');
const scannerBackdrop = document.getElementById('profile-scanner-backdrop');
const closeScannerButton = document.getElementById('profile-close-scanner');
const startScanButton = document.getElementById('profile-start-scan-button');
const stopScanButton = document.getElementById('profile-stop-scan-button');
const scannerPreview = document.getElementById('profile-scanner-preview');
const scannerMount = document.getElementById('profile-scanner-mount');
const scannerStatus = document.getElementById('profile-scanner-status');
const scannerResult = document.getElementById('profile-scanner-result');
const drawer = document.getElementById('profile-drawer');
const drawerBackdrop = document.getElementById('profile-drawer-backdrop');
const closeDrawerButton = document.getElementById('profile-close-drawer');
const logoutButton = document.getElementById('logout-button');

let currentUser = null;
let kitCodeLoaded = false;
let html5QrCode = null;
let lastDecodedValue = '';
let isHandlingScan = false;

function formatRotaSummary(rota) {
  if (!rota) {
    return '';
  }

  const parts = [];

  if (rota.nomeRota) {
    parts.push(rota.nomeRota);
  }

  if (rota.horario) {
    parts.push(`Horario: ${rota.horario}`);
  }

  return parts.join(' · ');
}

function formatAereoSummary(aereoDetalhes) {
  if (!aereoDetalhes) {
    return '';
  }

  const idaParts = [aereoDetalhes.companhiaIda, aereoDetalhes.vooIda, aereoDetalhes.origemIda && aereoDetalhes.destinoIda ? `${aereoDetalhes.origemIda} -> ${aereoDetalhes.destinoIda}` : '']
    .filter(Boolean);
  const voltaParts = [aereoDetalhes.companhiaVolta, aereoDetalhes.vooVolta, aereoDetalhes.origemVolta && aereoDetalhes.destinoVolta ? `${aereoDetalhes.origemVolta} -> ${aereoDetalhes.destinoVolta}` : '']
    .filter(Boolean);

  if (idaParts.length === 0 && voltaParts.length === 0) {
    return '';
  }

  const summaryLines = [];

  if (idaParts.length > 0) {
    summaryLines.push(`Ida: ${idaParts.join(' · ')}`);
  }

  if (voltaParts.length > 0) {
    summaryLines.push(`Volta: ${voltaParts.join(' · ')}`);
  }

  return summaryLines.join('\n');
}
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

function renderKitStatus(user) {
  if (!userKitStatus) {
    return;
  }

  userKitStatus.textContent = user && user.kit === true
    ? 'Kit ja retirado'
    : 'Retirada pendente';
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
  renderKitStatus(currentUser);
  setKitActionVisibility(window.magaluApi.hasPendingKit(currentUser));
}

setDrawerState(false);
setKitCodeModalState(false);
setScannerModalState(false);

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
    successMessage = 'Codigo carregado com sucesso.',
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
    generateKitCodeButton.textContent = 'Codigo carregado';
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
    successMessage: 'Codigo carregado com sucesso.',
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
      html5QrCode = new Html5Qrcode('profile-scanner-mount');
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
        // Ignora erros por frame para manter a leitura contínua.
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

const user = window.magaluApi.readStoredUser();

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`;

  profilePageTitle.textContent = userNameText;
  document.title = userNameText;
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  userIdMagalu.textContent = user.id_magalu || '-';
  userPontos.textContent = String(user.pontos || 0);
  userCheckins.textContent = String(user.totalCheckins || 0);
  userCpf.textContent = user.cpf || '-';
  userCargo.textContent = user.cargo || '-';
  userRegional.textContent = user.regional || '-';
  userFilial.textContent = user.filial || '-';
  renderKitStatus(user);
  userAereo.textContent = formatAereoSummary(user.aereoDetalhes) || user.aereo || '-';
  syncKitActionVisibility();
}

generateKitCodeButton.addEventListener('click', () => {
  loadUserKitCode();
});

openScannerButton.addEventListener('click', () => {
  setScannerModalState(true);
  setScannerStatus('Pronto para escanear.', 'info-message');
  updateScannerResult('Nenhum QR lido.');
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