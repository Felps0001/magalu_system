const STORAGE_KEY = 'magalu_system_user';

const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const userIdMagalu = document.getElementById('user-id-magalu');
const userPontos = document.getElementById('user-pontos');
const userTempo = document.getElementById('user-tempo');
const userCheckins = document.getElementById('user-checkins');
const userCpf = document.getElementById('user-cpf');
const userRegiao = document.getElementById('user-regiao');
const userLoja = document.getElementById('user-loja');
const userTurma = document.getElementById('user-turma');
const userTransfer = document.getElementById('user-transfer');
const estandesList = document.getElementById('estandes-list');
const generateQrCodeButton = document.getElementById('generate-qrcode-button');
const qrCodeMessage = document.getElementById('qrcode-message');
const qrCodePreview = document.getElementById('qrcode-preview');
const qrCodeJson = document.getElementById('qrcode-json');
const logoutButton = document.getElementById('logout-button');

let currentUser = null;

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function setQrCodeMessage(message, type = 'info-message') {
  if (!message) {
    qrCodeMessage.hidden = true;
    qrCodeMessage.textContent = '';
    qrCodeMessage.className = 'form-message info-message';
    return;
  }

  qrCodeMessage.hidden = false;
  qrCodeMessage.textContent = message;
  qrCodeMessage.className = `form-message ${type}`;
}

function renderQrCode(responseData) {
  qrCodePreview.innerHTML = responseData.qrCodeSvg;
  qrCodeJson.textContent = JSON.stringify(responseData.qrCodeData, null, 2);
}

function renderQrPlaceholder(message) {
  qrCodePreview.innerHTML = `<p class="muted">${message}</p>`;
  qrCodeJson.textContent = 'Nenhum QR Code carregado ainda.';
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
    autoOpen = false,
    buttonLoadingLabel = 'Gerando...',
    loadingMessage = 'Carregando QR Code do usuario...',
    successMessage = 'QR Code carregado com sucesso.',
  } = options;

  if (!currentUser || !currentUser._id) {
    setQrCodeMessage('Usuario nao encontrado para gerar o QR Code.', 'error');
    return;
  }

  generateQrCodeButton.disabled = true;
  generateQrCodeButton.textContent = buttonLoadingLabel;
  setQrCodeMessage(loadingMessage, 'info-message');

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    setQrCodeMessage(successMessage, 'success');
    generateQrCodeButton.textContent = 'QR Code carregado';
  } catch (error) {
    renderQrPlaceholder('O QR Code nao foi carregado.');
    setQrCodeMessage(error.message, 'error');
  } finally {
    generateQrCodeButton.disabled = false;

    if (!autoOpen || !currentUser || !currentUser.qrCodePayload) {
      generateQrCodeButton.textContent = 'Gerar QR Code';
    }
  }
}

function renderVisitedStands(estandesVisitados) {
  estandesList.innerHTML = '';

  if (!Array.isArray(estandesVisitados) || estandesVisitados.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'Nenhum estande visitado ainda.';
    estandesList.appendChild(emptyItem);
    return;
  }

  estandesVisitados.forEach((estande) => {
    const item = document.createElement('li');
    item.textContent = estande.nome || 'Estande sem nome';
    estandesList.appendChild(item);
  });
}

const rawUser = localStorage.getItem(STORAGE_KEY);

if (!rawUser) {
  redirectToLogin();
} else {
  const user = JSON.parse(rawUser);
  currentUser = user;

  userName.textContent = user.nome || 'Usuario';
  userRole.textContent = `${user.cargo || 'Sem cargo'} · ${user.loja || 'Sem loja'}`;
  userIdMagalu.textContent = user.id_magalu || '-';
  userPontos.textContent = String(user.pontos || 0);
  userTempo.textContent = String(user.tempo || 0);
  userCheckins.textContent = String(user.totalCheckins || 0);
  userCpf.textContent = user.cpf || '-';
  userRegiao.textContent = user.regiao || '-';
  userLoja.textContent = user.loja || '-';
  userTurma.textContent = user.turma || '-';
  userTransfer.textContent = user.transfer ? 'Sim' : 'Nao';
  renderVisitedStands(user.estandesVisitados);

  loadUserQrCode({
    autoOpen: true,
    buttonLoadingLabel: 'Carregando...',
    loadingMessage: 'Carregando seu QR Code salvo...',
    successMessage: 'Seu QR Code ja foi carregado automaticamente.',
  });
}

generateQrCodeButton.addEventListener('click', () => {
  loadUserQrCode();
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  redirectToLogin();
});