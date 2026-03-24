const logisticaUserName = document.getElementById('logistica-user-name');
const logisticaUserRole = document.getElementById('logistica-user-role');
const drawerUserName = document.getElementById('logistica-drawer-user-name');
const drawerUserRole = document.getElementById('logistica-drawer-user-role');
const rotaValue = document.getElementById('logistica-transfer');
const aereoValue = document.getElementById('logistica-aereo');
const hospedagemValue = document.getElementById('logistica-hospedagem');
const menuButton = document.getElementById('logistica-menu-button');
const drawer = document.getElementById('logistica-drawer');
const drawerBackdrop = document.getElementById('logistica-drawer-backdrop');
const closeDrawerButton = document.getElementById('logistica-close-drawer');
const openScannerMenuButton = document.getElementById('logistica-open-scanner-menu');
const openKitCodeMenuButton = document.getElementById('logistica-open-kit-code-menu');
const openScannerButton = document.getElementById('logistica-open-scanner');
const scannerModal = document.getElementById('logistica-scanner-modal');
const scannerBackdrop = document.getElementById('logistica-scanner-backdrop');
const closeScannerButton = document.getElementById('logistica-close-scanner');
const startScanButton = document.getElementById('logistica-start-scan-button');
const stopScanButton = document.getElementById('logistica-stop-scan-button');
const scannerPreview = document.getElementById('logistica-scanner-preview');
const scannerStatus = document.getElementById('logistica-scanner-status');
const scannerResult = document.getElementById('logistica-scanner-result');
const kitCodeModal = document.getElementById('logistica-kit-code-modal');
const kitCodeBackdrop = document.getElementById('logistica-kit-code-backdrop');
const closeKitCodeButton = document.getElementById('logistica-close-kit-code');
const closeKitCodeSecondaryButton = document.getElementById('logistica-close-kit-code-secondary');
const generateKitCodeButton = document.getElementById('logistica-generate-kit-code-button');
const kitCodePreview = document.getElementById('logistica-kit-code-preview');
const logoutButton = document.getElementById('logout-button');
const sectionLinks = {
  rota: document.getElementById('logistica-link-rota'),
  aereo: document.getElementById('logistica-link-aereo'),
  hospedagem: document.getElementById('logistica-link-hospedagem'),
};

let currentUser = null;
let kitCodeLoaded = false;
let drawerCloseTimer = null;
let html5QrCode = null;
let lastDecodedValue = '';
let isHandlingScan = false;

function renderLogisticaUser(user) {
  if (!user) {
    return;
  }

  currentUser = user;
  const userNameText = user.nome || 'Usuario';
  const userRoleText = `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`;

  logisticaUserName.textContent = userNameText;
  logisticaUserRole.textContent = 'Informacoes da sua rota, do seu aereo e da sua hospedagem no evento.';
  drawerUserName.textContent = userNameText;
  drawerUserRole.textContent = userRoleText;
  rotaValue.textContent = formatRotaDetails(user.rota) || 'Nao informado.';
  aereoValue.textContent = formatAereoDetails(user.aereoDetalhes) || user.aereo || 'Nao informado.';
  hospedagemValue.textContent = formatHospedagemDetails(user.hospedagem) || 'Nao informado.';
  window.magaluApi.storeUser(user);
}

async function refreshCurrentUser() {
  if (!currentUser || !currentUser._id) {
    return;
  }

  const freshUser = await window.magaluApi.fetchUserById(currentUser._id);

  if (!freshUser) {
    return;
  }

  renderLogisticaUser({
    ...currentUser,
    ...freshUser,
  });
}

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

function formatHospedagemDetails(hospedagem) {
  if (!hospedagem) {
    return '';
  }

  const lines = [];

  if (hospedagem.nomeHotel) {
    lines.push(`Hotel: ${hospedagem.nomeHotel}`);
  }

  if (hospedagem.checkIn) {
    lines.push(`Check-in: ${hospedagem.checkIn}`);
  }

  if (hospedagem.checkOut) {
    lines.push(`Check-out: ${hospedagem.checkOut}`);
  }

  // if (hospedagem.enderecoHotel) {
  //   lines.push(`Endereco: ${hospedagem.enderecoHotel}`);
  // }

  return lines.join('\n');
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
      html5QrCode = new Html5Qrcode('logistica-scanner-mount');
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
setKitCodeModalState(false);
setScannerModalState(false);

const user = window.magaluApi.readStoredUser();

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  renderLogisticaUser(user);
  syncKitActionVisibility();
  refreshCurrentUser();
}

highlightCurrentSection();

generateKitCodeButton.addEventListener('click', () => {
  loadUserKitCode();
});

openScannerMenuButton.addEventListener('click', () => {
  setDrawerState(false);
  setScannerModalState(true);
  setScannerStatus('Pronto para escanear.', 'info-message');
  updateScannerResult('Nenhum QR lido.');
});

openScannerButton.addEventListener('click', () => {
  setScannerModalState(true);
  setScannerStatus('Pronto para escanear.', 'info-message');
  updateScannerResult('Nenhum QR lido.');
});

openKitCodeMenuButton.addEventListener('click', () => {
  openKitCodeModal();
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

  if (!kitCodeModal.hidden) {
    setKitCodeModalState(false);
  }

  if (!drawer.hidden) {
    setDrawerState(false);
  }
});