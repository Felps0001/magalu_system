const logisticaUserName = document.getElementById('logistica-user-name');
const logisticaUserRole = document.getElementById('logistica-user-role');
const drawerUserName = document.getElementById('logistica-drawer-user-name');
const drawerUserRole = document.getElementById('logistica-drawer-user-role');
const rotaValue = document.getElementById('logistica-transfer');
const aereoValue = document.getElementById('logistica-aereo');
const menuButton = document.getElementById('logistica-menu-button');
const drawer = document.getElementById('logistica-drawer');
const drawerBackdrop = document.getElementById('logistica-drawer-backdrop');
const closeDrawerButton = document.getElementById('logistica-close-drawer');
const openScannerMenuButton = document.getElementById('logistica-open-scanner-menu');
const openQrCodeMenuButton = document.getElementById('logistica-open-qrcode-menu');
const openScannerButton = document.getElementById('logistica-open-scanner');
const scannerModal = document.getElementById('logistica-scanner-modal');
const scannerBackdrop = document.getElementById('logistica-scanner-backdrop');
const closeScannerButton = document.getElementById('logistica-close-scanner');
const startScanButton = document.getElementById('logistica-start-scan-button');
const stopScanButton = document.getElementById('logistica-stop-scan-button');
const scannerPreview = document.getElementById('logistica-scanner-preview');
const scannerStatus = document.getElementById('logistica-scanner-status');
const scannerResult = document.getElementById('logistica-scanner-result');
const qrCodeModal = document.getElementById('logistica-qrcode-modal');
const qrCodeBackdrop = document.getElementById('logistica-qrcode-backdrop');
const closeQrCodeButton = document.getElementById('logistica-close-qrcode');
const closeQrCodeSecondaryButton = document.getElementById('logistica-close-qrcode-secondary');
const generateQrCodeButton = document.getElementById('logistica-generate-qrcode-button');
const qrCodePreview = document.getElementById('logistica-qrcode-preview');
const logoutButton = document.getElementById('logout-button');
const sectionLinks = {
  rota: document.getElementById('logistica-link-rota'),
  aereo: document.getElementById('logistica-link-aereo'),
};

let currentUser = null;
let qrCodeLoaded = false;
let drawerCloseTimer = null;
let html5QrCode = null;
let lastDecodedValue = '';
let isHandlingScan = false;

function formatRotaDetails(rota) {
  if (!rota) {
    return '';
  }

  const lines = [];

  if (rota.nomeRota) {
    lines.push(`Rota: ${rota.nomeRota}`);
  }

  if (rota.horario) {
    lines.push(`Horario: ${rota.horario}`);
  }

  return lines.join('\n');
}

function formatAereoDetails(aereoDetalhes) {
  if (!aereoDetalhes) {
    return '';
  }

  const idaLines = [
    aereoDetalhes.companhiaIda ? `Companhia ida: ${aereoDetalhes.companhiaIda}` : '',
    aereoDetalhes.dataSaidaIda ? `Data saida ida: ${aereoDetalhes.dataSaidaIda}` : '',
    aereoDetalhes.vooIda ? `Voo ida: ${aereoDetalhes.vooIda}` : '',
    aereoDetalhes.origemIda ? `Origem ida: ${aereoDetalhes.origemIda}` : '',
    aereoDetalhes.destinoIda ? `Destino ida: ${aereoDetalhes.destinoIda}` : '',
    aereoDetalhes.horarioIda ? `Horario ida: ${aereoDetalhes.horarioIda}` : '',
    aereoDetalhes.horarioChegadaIda ? `Horario chegada ida: ${aereoDetalhes.horarioChegadaIda}` : '',
    aereoDetalhes.dataChegadaIda ? `Data chegada ida: ${aereoDetalhes.dataChegadaIda}` : '',
  ].filter(Boolean);
  const voltaLines = [
    aereoDetalhes.companhiaVolta ? `Companhia volta: ${aereoDetalhes.companhiaVolta}` : '',
    aereoDetalhes.dataSaidaVolta ? `Data saida volta: ${aereoDetalhes.dataSaidaVolta}` : '',
    aereoDetalhes.vooVolta ? `Voo volta: ${aereoDetalhes.vooVolta}` : '',
    aereoDetalhes.origemVolta ? `Origem volta: ${aereoDetalhes.origemVolta}` : '',
    aereoDetalhes.destinoVolta ? `Destino volta: ${aereoDetalhes.destinoVolta}` : '',
    aereoDetalhes.horarioVolta ? `Horario volta: ${aereoDetalhes.horarioVolta}` : '',
    aereoDetalhes.horarioChegadaVolta ? `Horario chegada volta: ${aereoDetalhes.horarioChegadaVolta}` : '',
    aereoDetalhes.dataChegadaVolta ? `Data chegada volta: ${aereoDetalhes.dataChegadaVolta}` : '',
  ].filter(Boolean);

  return [idaLines.join('\n'), voltaLines.join('\n')].filter(Boolean).join('\n\n');
}

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
    setScannerStatus('A camera so pode ser aberta em HTTPS ou localhost.', 'error');
    return;
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('logistica-scanner-mount');
    }

    startScanButton.disabled = true;
    stopScanButton.disabled = false;
    isHandlingScan = false;
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
      async (decodedText) => {
        if (!decodedText || decodedText === lastDecodedValue || isHandlingScan) {
          return;
        }

        lastDecodedValue = decodedText;
        updateScannerResult(decodedText);
        const destinationUrl = window.magaluApi.resolveQrNavigationUrl(decodedText);

        if (!destinationUrl) {
          setScannerStatus('QR Code lido, mas sem uma rota valida para redirecionamento.', 'error');
          return;
        }

        isHandlingScan = true;
        setScannerStatus('QR Code lido com sucesso. Redirecionando...', 'success');

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

function highlightCurrentSection() {
  const activeHash = window.location.hash.replace('#', '') || 'rota';

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
setScannerModalState(false);

const user = window.magaluApi.readStoredUser();

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.filial || user.loja || 'Sem filial'}`;

  logisticaUserName.textContent = userNameText;
  logisticaUserRole.textContent = 'Informacoes da sua rota e do seu aereo no evento.';
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  rotaValue.textContent = formatRotaDetails(user.rota) || 'Nao informado.';
  aereoValue.textContent = formatAereoDetails(user.aereoDetalhes) || user.aereo || 'Nao informado.';
}

highlightCurrentSection();

generateQrCodeButton.addEventListener('click', () => {
  loadUserQrCode();
});

openScannerMenuButton.addEventListener('click', () => {
  setDrawerState(false);
  setScannerModalState(true);
  setScannerStatus('Aguardando inicialização...', 'info-message');
  updateScannerResult('Nenhum QR Code lido ainda.');
});

openScannerButton.addEventListener('click', () => {
  setScannerModalState(true);
  setScannerStatus('Aguardando inicialização...', 'info-message');
  updateScannerResult('Nenhum QR Code lido ainda.');
});

openQrCodeMenuButton.addEventListener('click', () => {
  openQrCodeModal();
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

window.addEventListener('beforeunload', () => {
  stopScanner();
});

window.addEventListener('hashchange', () => {
  highlightCurrentSection();
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