const scannerStatus = document.getElementById('scanner-status');
const scannerResult = document.getElementById('scanner-result');
const scannerResultLink = document.getElementById('scanner-result-link');
const startScanButton = document.getElementById('start-scan-button');
const stopScanButton = document.getElementById('stop-scan-button');
const scannerPreview = document.getElementById('scanner-preview');

const currentUser = window.magaluApi.readStoredUser();

let html5QrCode = null;
let lastDecodedValue = '';
let redirectTimeoutId = null;

if (!currentUser) {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

if (window.magaluApi.requiresFirstAccess(currentUser)) {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setScannerStatus(message, type) {
  scannerStatus.textContent = message;
  scannerStatus.className = `form-message ${type}`;
}

function updateResult(value) {
  scannerResult.textContent = value || 'Nenhum QR Code lido ainda.';

  if (value && /^https?:\/\//i.test(value)) {
    scannerResultLink.hidden = false;
    scannerResultLink.href = value;
  } else {
    scannerResultLink.hidden = true;
    scannerResultLink.removeAttribute('href');
  }
}

function scheduleRedirect(value) {
  if (!/^https?:\/\//i.test(value)) {
    return;
  }

  if (redirectTimeoutId) {
    clearTimeout(redirectTimeoutId);
  }

  setScannerStatus('QR Code lido. Abrindo o link...', 'success');
  redirectTimeoutId = window.setTimeout(() => {
    window.location.href = value;
  }, 600);
}

async function stopScanner() {
  if (redirectTimeoutId) {
    clearTimeout(redirectTimeoutId);
    redirectTimeoutId = null;
  }

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
    updateResult('Nenhum QR Code lido ainda.');
    lastDecodedValue = '';
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
        updateResult(decodedText);
        scheduleRedirect(decodedText);

        if (navigator.vibrate) {
          navigator.vibrate(120);
        }
      },
      () => {
        // Ignora erros por frame para manter a leitura contínua.
      }
    );

    setScannerStatus('Camera ativa. Aponte para um QR Code.', 'info-message');
    scannerPreview.classList.add('scanner-active');
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

startScanButton.addEventListener('click', () => {
  startScanner();
});

stopScanButton.addEventListener('click', async () => {
  await stopScanner();
  setScannerStatus('Camera encerrada.', 'info-message');
});

window.addEventListener('beforeunload', () => {
  stopScanner();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    stopScanner();
  }
});
