const scannerStatus = document.getElementById('scanner-status');
const scannerResult = document.getElementById('scanner-result');
const scannerOutputCard = document.getElementById('scanner-output-card');
const scannerOutputSummary = document.getElementById('scanner-output-summary');
const scannerOutputMeta = document.getElementById('scanner-output-meta');
const scannerInput = document.getElementById('scanner-input');
const focusScanButton = document.getElementById('focus-scan-button');
const processScanButton = document.getElementById('process-scan-button');
const clearScanButton = document.getElementById('clear-scan-button');

let isHandlingScan = false;

function focusScannerInput() {
  scannerInput.focus();
  scannerInput.select();
}

function setScannerStatus(message, type) {
  scannerStatus.textContent = message;
  scannerStatus.className = `form-message ${type}`;
}

function updateResult(value) {
  scannerResult.textContent = value || 'Nenhum QR lido.';
}

function setOutputState(state) {
  scannerOutputCard.classList.remove(
    'scanner-output-card--neutral',
    'scanner-output-card--ready',
    'scanner-output-card--blocked'
  );

  if (state === 'ready') {
    scannerOutputCard.classList.add('scanner-output-card--ready');
    return;
  }

  if (state === 'blocked') {
    scannerOutputCard.classList.add('scanner-output-card--blocked');
    return;
  }

  scannerOutputCard.classList.add('scanner-output-card--neutral');
}

function updateKitStatus(summary, metaText, state = 'neutral') {
  setOutputState(state);
  scannerOutputSummary.textContent = summary;
  scannerOutputMeta.textContent = metaText;
}

function getApiHelpers() {
  const api = window.magaluApi || {};

  return {
    buildApiUrl: api.buildApiUrl || ((path) => path),
    withApiDefaults: api.withApiDefaults || ((options) => options),
    parseApiResponse: api.parseApiResponse || (async (response) => response.json()),
  };
}

async function consultarKit(userId) {
  const { buildApiUrl, withApiDefaults, parseApiResponse } = getApiHelpers();

  const response = await fetch(
    buildApiUrl(`/api/users/${userId}/kit`),
    withApiDefaults({ method: 'GET' })
  );
  const payload = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(payload.error || 'Erro ao consultar kit');
  }

  return payload;
}

async function marcarKit(userId) {
  const { buildApiUrl, withApiDefaults, parseApiResponse } = getApiHelpers();

  const response = await fetch(
    buildApiUrl(`/api/users/${userId}/kit`),
    withApiDefaults({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  );
  const payload = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(payload.error || 'Erro ao marcar kit');
  }

  return payload;
}

function buildKitMeta(user) {
  const extraInfo = user.kitExtra
    ? `\nKit extra: sim\nRetirada kit extra: ${user.kitExtraRetirada ? 'sim' : 'nao'}`
    : '\nKit extra: nao';

  return `ID Magalu: ${user.id_magalu || '-'}\nFilial: ${user.filial || '-'}\nRegional: ${user.regional || '-'}\nCargo: ${user.cargo || '-'}${extraInfo}`;
}

function getNextKitAction(user) {
  if (!user.kit) {
    return 'kit';
  }

  if (user.kitExtra && !user.kitExtraRetirada) {
    return 'kitExtra';
  }

  return 'done';
}

async function processarKit(userId) {
  const user = await consultarKit(userId);
  const meta = buildKitMeta(user);
  const nextAction = getNextKitAction(user);

  if (nextAction === 'done') {
    if (user.kitExtra && user.kitExtraRetirada) {
      updateKitStatus(`Kit e kit extra ja retirados por ${user.nome || 'usuario'}.`, meta, 'blocked');
      setScannerStatus('Este usuario ja retirou kit e kit extra.', 'success');
      return;
    }

    updateKitStatus(`Kit ja retirado por ${user.nome || 'usuario'}.`, meta, 'blocked');
    setScannerStatus('Este usuario ja retirou o kit.', 'success');
    return;
  }

  updateKitStatus(
    nextAction === 'kitExtra'
      ? `Kit extra liberado para ${user.nome || 'usuario'}.`
      : `Kit liberado para ${user.nome || 'usuario'}.`,
    meta,
    'ready'
  );
  setScannerStatus(nextAction === 'kitExtra' ? 'Kit extra pendente. Marcando retirada...' : 'Kit pendente. Marcando retirada...', 'info-message');
  await marcarKit(userId);

  const updatedUser = await consultarKit(userId);
  const updatedMeta = buildKitMeta(updatedUser);

  if (nextAction === 'kitExtra') {
    updateKitStatus(`Kit extra retirado por ${updatedUser.nome || 'usuario'}.`, updatedMeta, 'ready');
    setScannerStatus('Kit extra marcado com sucesso!', 'success');
    return;
  }

  if (updatedUser.kitExtra && !updatedUser.kitExtraRetirada) {
    updateKitStatus(`Kit retirado. Kit extra ainda disponivel para ${updatedUser.nome || 'usuario'}.`, updatedMeta, 'ready');
    setScannerStatus('Kit marcado com sucesso! Kit extra segue disponivel.', 'success');
    return;
  }

  updateKitStatus(`Kit retirado por ${updatedUser.nome || 'usuario'}.`, updatedMeta, 'ready');
  setScannerStatus('Kit marcado com sucesso!', 'success');
}

function extractUserIdFromPayload(rawValue) {
  try {
    const payload = JSON.parse(rawValue);
    return payload && payload.user && payload.user.userId ? payload.user.userId : '';
  } catch (error) {
    return '';
  }
}

function resetScannerInput() {
  scannerInput.value = '';
  focusScannerInput();
}

async function processScannedValue(rawValue) {
  const normalizedValue = typeof rawValue === 'string' ? rawValue.trim() : '';

  if (!normalizedValue || isHandlingScan) {
    return;
  }

  updateResult(normalizedValue);

  const userId = extractUserIdFromPayload(normalizedValue);

  if (!userId) {
    updateKitStatus('QR invalido para kit.', 'O conteudo lido nao corresponde ao QR de participante do app.', 'blocked');
    setScannerStatus('QR invalido para kit.', 'error');
    return;
  }

  isHandlingScan = true;
  processScanButton.disabled = true;
  clearScanButton.disabled = true;

  if (navigator.vibrate) {
    navigator.vibrate(120);
  }

  try {
    await processarKit(userId);
  } catch (error) {
    updateKitStatus('Falha ao consultar usuario.', 'Verifique se o QR pertence ao ambiente publicado e se o usuario existe no banco.', 'blocked');
    setScannerStatus(`Falha ao consultar kit: ${error.message}`, 'error');
  } finally {
    isHandlingScan = false;
    processScanButton.disabled = false;
    clearScanButton.disabled = false;
    resetScannerInput();
  }
}

focusScanButton.addEventListener('click', () => {
  focusScannerInput();
  setScannerStatus('Leitura ativada. Aguardando scanner...', 'info-message');
});

processScanButton.addEventListener('click', async () => {
  await processScannedValue(scannerInput.value);
});

clearScanButton.addEventListener('click', () => {
  updateResult('Nenhum QR lido.');
  updateKitStatus('Nenhum participante consultado.', 'Escaneie um QR do app para consultar e baixar o kit.', 'neutral');
  setScannerStatus('Campo limpo. Aguardando nova leitura.', 'info-message');
  resetScannerInput();
});

scannerInput.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  await processScannedValue(scannerInput.value);
});

scannerInput.addEventListener('input', () => {
  if (scannerInput.value.trim()) {
    setScannerStatus('Leitura recebida. Pressione Enter se o scanner nao enviar automaticamente.', 'info-message');
  }
});

window.addEventListener('load', () => {
  resetScannerInput();
  setScannerStatus('Pronto para escanear.', 'info-message');
});

document.addEventListener('click', (event) => {
  if (event.target !== scannerInput && !scannerInput.contains(event.target)) {
    focusScannerInput();
  }
});

updateKitStatus('Nenhum participante consultado.', 'Escaneie um QR do app para consultar e baixar o kit.', 'neutral');
