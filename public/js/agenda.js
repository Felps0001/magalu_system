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
const agendaDay27Section = document.getElementById('agenda-day-27-section');
const agendaDay27List = document.getElementById('agenda-day-27-list');
const agendaDay27Note = document.getElementById('agenda-day-27-note');

const FORCE_SHOW_DAY_27 = false;

const REGIONAL_TO_DIRETORIA = {
  ARACAJU: 'N_NE',
  'BELEM DO PARA': 'N_NE',
  FORTALEZA: 'N_NE',
  'JOAO PESSOA': 'N_NE',
  MACEIO: 'N_NE',
  MARABA: 'N_NE',
  NATAL: 'N_NE',
  PETROLINA: 'N_NE',
  RECIFE: 'N_NE',
  SALVADOR: 'N_NE',
  'SAO LUIS': 'N_NE',
  TERESINA: 'N_NE',
  BAURU: 'SP_RJ',
  CAMPINAS: 'SP_RJ',
  'CAPITAL RIO': 'SP_RJ',
  'GRANDE RIO': 'SP_RJ',
  'RIBEIRAO PRETO': 'SP_RJ',
  'RIO PRETO': 'SP_RJ',
  'ABC LITORAL': 'SP_RJ',
  'OESTE SUL': 'SP_RJ',
  'ZONA LESTE': 'SP_RJ',
  VALE: 'SP_RJ',
  'BARRA BONITA': 'VIRTUAL',
  BATATAIS: 'VIRTUAL',
  'CAMPO BOM': 'VIRTUAL',
  COSMOPOLIS: 'VIRTUAL',
  IBIPORA: 'VIRTUAL',
  OLIMPIA: 'VIRTUAL',
  'SAO LOURENCO': 'VIRTUAL',
  CAXIAS: 'SUL',
  CHAPECO: 'SUL',
  CURITIBA: 'SUL',
  FLORIANOPOLIS: 'SUL',
  LONDRINA: 'SUL',
  'PORTO ALEGRE': 'SUL',
  'BELO HORIZONTE': 'MG/CO',
  BRASILIA: 'MG/CO',
  'CAMPO GRANDE': 'MG/CO',
  CUIABA: 'MG/CO',
  'JUIZ DE FORA': 'MG/CO',
  UBERLANDIA: 'MG/CO',
};

const DAY_27_AGENDA = [
  { time: '08h00', title: 'Feira' },
  { time: '09h00', title: 'Abertura' },
  { time: '09h30', title: 'Fornecedor: Samsung' },
  { time: '10h00', title: 'Oficina simultanea: Rodada 1', round: 1 },
  { time: '10h50', title: 'Intervalo' },
  { time: '11h00', title: 'Fornecedor: JBL' },
  { time: '11h30', title: 'Oficina: Rodada 2', round: 2 },
  { time: '12h20', title: 'Almoco' },
  { time: '13h50', title: 'Fornecedor: Mondial/Aiwa' },
  { time: '14h20', title: 'Oficina: Rodada 3', round: 3 },
  { time: '15h10', title: 'Intervalo' },
  { time: '15h20', title: 'Oficina: Rodada 4', round: 4 },
  { time: '16h10', title: 'Intervalo' },
  { time: '16h20', title: 'Oficina: Rodada 5', round: 5 },
  { time: '17h10', title: 'Intervalo' },
  { time: '17h20', title: 'Oficina: Rodada 6', round: 6 },
  { time: '18h10', title: 'Intervalo' },
  { time: '18h20', title: 'Reconhecimento Academia do Varejo' },
];

const DAY_27_WORKSHOP_TRACKS = {
  1: {
    SP_RJ: 'Agente integrador',
    'MG/CO': 'Agente integrador',
    VIRTUAL: 'Agente integrador',
    N_NE: 'Agente integrador',
    SUL: 'Agente integrador',
  },
  2: {
    SP_RJ: 'Feira',
    'MG/CO': 'Feira',
    VIRTUAL: 'Servicos & Consorcio',
    N_NE: 'Credito',
    SUL: 'Operacoes',
  },
  3: {
    SP_RJ: 'Operacoes',
    'MG/CO': 'Feira',
    VIRTUAL: 'Feira',
    N_NE: 'Servicos & Consorcio',
    SUL: 'Credito',
  },
  4: {
    SP_RJ: 'Credito',
    'MG/CO': 'Operacoes',
    VIRTUAL: 'Feira',
    N_NE: 'Feira',
    SUL: 'Servicos & Consorcio',
  },
  5: {
    SP_RJ: 'Servicos & Consorcio',
    'MG/CO': 'Credito',
    VIRTUAL: 'Operacoes',
    N_NE: 'Feira',
    SUL: 'Feira',
  },
  6: {
    SP_RJ: 'Feira',
    'MG/CO': 'Servicos & Consorcio',
    VIRTUAL: 'Credito',
    N_NE: 'Operacoes',
    SUL: 'Feira',
  },
};

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
  scannerModal.setAttribute('aria-hidden', String(!isOpen));
  openScannerButton.setAttribute('aria-expanded', String(isOpen));
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

function normalizeLookupValue(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, '_')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ');
}

function normalizeDiretoria(value) {
  const normalizedValue = normalizeLookupValue(value)
    .replace(/\s+/g, '_')
    .replace('CO_MG', 'MG/CO')
    .replace('MG_CO', 'MG/CO')
    .replace('N_NE', 'N_NE')
    .replace('N/NE', 'N_NE');

  if (normalizedValue === 'SP_RJ' || normalizedValue === 'VIRTUAL' || normalizedValue === 'SUL' || normalizedValue === 'MG/CO' || normalizedValue === 'N_NE') {
    return normalizedValue;
  }

  return '';
}

function getDiretoriaForUser(user) {
  const diretoriaFromUser = normalizeDiretoria(user && user.diretoria);

  if (diretoriaFromUser) {
    return diretoriaFromUser;
  }

  const normalizedRegional = normalizeLookupValue(user && user.regional);

  return REGIONAL_TO_DIRETORIA[normalizedRegional] || '';
}

function shouldShowDay27Agenda() {
  return FORCE_SHOW_DAY_27;
}

function createAgendaCard(title, detailLabel, detailValue) {
  const card = document.createElement('div');
  card.className = 'agenda-item-mobile-card agenda-item-mobile-card--public';

  const titleText = document.createElement('strong');
  titleText.textContent = title;
  card.appendChild(titleText);

  if (!detailValue) {
    card.classList.add('agenda-item-mobile-card--single');
    return card;
  }

  card.classList.add('agenda-item-mobile-card--detail');

  const detailColumn = document.createElement('div');
  detailColumn.className = 'agenda-item-detail';
  const detailLabelElement = document.createElement('p');
  detailLabelElement.className = 'agenda-item-label';
  detailLabelElement.textContent = detailLabel;
  const detailValueElement = document.createElement('span');
  detailValueElement.className = 'agenda-item-detail-value';
  detailValueElement.textContent = detailValue;

  detailColumn.appendChild(detailLabelElement);
  detailColumn.appendChild(detailValueElement);
  card.appendChild(detailColumn);

  return card;
}

function createAgendaItem({ time, title, detailLabel = '', detailValue = '' }) {
  const article = document.createElement('article');
  article.className = 'agenda-item-mobile agenda-item-mobile--public';

  const meta = document.createElement('div');
  meta.className = 'agenda-item-mobile-meta agenda-item-mobile-meta--public';

  const timeElement = document.createElement('span');
  timeElement.className = 'agenda-item-time agenda-item-time--public';
  timeElement.textContent = time;

  meta.appendChild(timeElement);
  article.appendChild(meta);
  article.appendChild(createAgendaCard(title, detailLabel, detailValue));

  return article;
}

function getWorkshopTrack(round, diretoria) {
  const roundTracks = DAY_27_WORKSHOP_TRACKS[round];

  if (!roundTracks) {
    return '';
  }

  return roundTracks[diretoria] || '';
}

function renderDay27Agenda(user) {
  if (!agendaDay27Section || !agendaDay27List || !agendaDay27Note) {
    return;
  }

  const isVisible = shouldShowDay27Agenda();
  setSectionVisibility(agendaDay27Section, isVisible);

  if (!isVisible) {
    return;
  }

  const diretoria = getDiretoriaForUser(user);
  agendaDay27List.innerHTML = '';

  DAY_27_AGENDA.forEach((entry) => {
    const workshopTrack = entry.round ? getWorkshopTrack(entry.round, diretoria) : '';
    const agendaItem = createAgendaItem({
      time: entry.time,
      title: entry.title,
      detailLabel: workshopTrack ? 'Trilha da sua diretoria' : '',
      detailValue: workshopTrack ? workshopTrack : '',
    });

    agendaDay27List.appendChild(agendaItem);
  });

  if (!diretoria) {
    agendaDay27Note.textContent = 'Oficinas exibidas em modo de validacao. Diretoria do usuario ainda nao identificada.';
    return;
  }

  agendaDay27Note.textContent = `Oficinas exibidas para a diretoria ${diretoria}.`;
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
  renderDay27Agenda(user);
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