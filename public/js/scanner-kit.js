// scanner-kit.js
// Scanner específico para kit: ao escanear QR, marca kit=true no backend

const scannerStatus = document.getElementById('scanner-status');
const scannerResult = document.getElementById('scanner-result');
const startScanButton = document.getElementById('start-scan-button');
const stopScanButton = document.getElementById('stop-scan-button');
const scannerPreview = document.getElementById('scanner-preview');

let html5QrCode = null;
let lastDecodedValue = '';

function setScannerStatus(message, type) {
  scannerStatus.textContent = message;
  scannerStatus.className = `form-message ${type}`;
}

function updateResult(value) {
  scannerResult.textContent = value || 'Nenhum QR Code lido ainda.';
}

async function marcarKit(userId) {
  setScannerStatus('Marcando kit para usuário...', 'info-message');
  try {
    const resp = await fetch(`/api/users/${userId}/kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.ok) throw new Error('Erro ao marcar kit');
    setScannerStatus('Kit marcado com sucesso!', 'success');
  } catch (err) {
    setScannerStatus('Falha ao marcar kit: ' + err.message, 'error');
  }
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
    await html5QrCode.clear();
  } catch (error) {
    console.error('Falha ao parar scanner:', error);
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
      async (decodedText) => {
        if (!decodedText || decodedText === lastDecodedValue) return;
        lastDecodedValue = decodedText;
        updateResult(decodedText);
        // Tenta extrair userId do QR
        let userId = '';
        try {
          const payload = JSON.parse(decodedText);
          userId = payload.user && payload.user.userId ? payload.user.userId : '';
        } catch (e) {
          setScannerStatus('QR inválido para kit.', 'error');
          return;
        }
        if (!userId) {
          setScannerStatus('QR sem userId.', 'error');
          return;
        }
        await marcarKit(userId);
        if (navigator.vibrate) navigator.vibrate(120);
      },
      () => {}
    );
    setScannerStatus('Camera ativa. Aponte para um QR Code.', 'info-message');
    scannerPreview.classList.add('scanner-active');
  } catch (error) {
    startScanButton.disabled = false;
    stopScanButton.disabled = true;
    scannerPreview.classList.remove('scanner-active');
    setScannerStatus('Nao foi possivel abrir a camera.', 'error');
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
