const sessionQrCodeTitle = document.getElementById('session-qrcode-title');
const sessionQrCodeStatus = document.getElementById('session-qrcode-status');
const sessionQrCodePreview = document.getElementById('session-qrcode-preview');

const sessionQrPageParams = new URLSearchParams(window.location.search);
const sessionQrStageId = window.magaluQuestions.normalizeStageId(sessionQrPageParams.get('palestraId'));

function formatSessionQrDateTime(value) {
  if (!value) {
    return 'Agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function setSessionQrStatus(message, type) {
  sessionQrCodeStatus.textContent = message;
  sessionQrCodeStatus.className = `form-message ${type}`;
}

function renderSessionQrPlaceholder(message) {
  sessionQrCodePreview.innerHTML = `<p id="session-qrcode-status" class="questions-session-summary">${message}</p>`;
}

function renderSessionQr(data) {
  sessionQrCodeTitle.textContent = data.palestraLabel;
  sessionQrCodePreview.innerHTML = data.qrCodeSvg;
}

async function loadSessionQrCode() {
  if (!sessionQrStageId) {
    setSessionQrStatus('Nao foi possivel identificar o palco deste QR.', 'error');
    renderSessionQrPlaceholder('Palco invalido.');
    return;
  }

  setSessionQrStatus('Carregando QR da sessao...', 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions/sessions/qrcode?palestraId=${encodeURIComponent(sessionQrStageId)}`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel carregar o QR desta sessao.');
    }

    renderSessionQr(data);
  } catch (error) {
    renderSessionQrPlaceholder('Nenhuma sessao ativa para exibir o QR neste palco.');
    const statusElement = document.getElementById('session-qrcode-status');

    if (statusElement) {
      statusElement.textContent = error.message;
    }
  }
}

loadSessionQrCode();

window.setInterval(() => {
  if (!document.hidden) {
    loadSessionQrCode();
  }
}, 30000);