let deferredInstallPrompt;
let refreshing;
let activeRegistration;

function getInstallButton() {
  return document.getElementById('install-button');
}

function getUpdateButton() {
  return document.getElementById('update-button');
}

function getUpdateMessage() {
  return document.getElementById('update-message');
}

function showUpdateMessage(message) {
  const updateMessage = getUpdateMessage();

  if (!updateMessage) {
    return;
  }

  updateMessage.textContent = message;
  updateMessage.hidden = false;
}

function hideUpdateMessage() {
  const updateMessage = getUpdateMessage();

  if (!updateMessage) {
    return;
  }

  updateMessage.hidden = true;
  updateMessage.textContent = '';
}

function showInstallButton() {
  const installButton = getInstallButton();

  if (installButton) {
    installButton.hidden = false;
  }
}

function hideInstallButton() {
  const installButton = getInstallButton();

  if (installButton) {
    installButton.hidden = true;
  }
}

function setUpdateButtonState({ disabled, label }) {
  const updateButton = getUpdateButton();

  if (!updateButton) {
    return;
  }

  updateButton.disabled = disabled;

  if (label) {
    updateButton.textContent = label;
  }
}

function activateWaitingWorker(registration) {
  if (!registration || !registration.waiting) {
    return false;
  }

  showUpdateMessage('Nova versao encontrada. Atualizando aplicativo...');
  setUpdateButtonState({ disabled: true, label: 'Atualizando...' });
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

async function checkForUpdates({ manual = false } = {}) {
  if (!activeRegistration) {
    if (manual) {
      showUpdateMessage('Atualizacao indisponivel no momento.');
    }
    return;
  }

  setUpdateButtonState({ disabled: true, label: 'Verificando...' });

  try {
    await activeRegistration.update();

    if (activateWaitingWorker(activeRegistration)) {
      return;
    }

    if (manual) {
      showUpdateMessage('O aplicativo ja esta na versao mais recente.');
    } else {
      hideUpdateMessage();
    }
  } catch (error) {
    if (manual) {
      showUpdateMessage('Nao foi possivel verificar atualizacoes agora.');
    }

    console.error('Falha ao verificar atualizacao do aplicativo:', error);
  } finally {
    setUpdateButtonState({ disabled: false, label: 'Atualizar app' });
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const serviceWorkerUrl = new URL('../sw.js', window.location.href);
    const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
      updateViaCache: 'none',
    });

    activeRegistration = registration;

    if (activateWaitingWorker(registration)) {
      return;
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (!newWorker) {
        return;
      }

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateMessage('Atualizacao encontrada. Recarregando...');
          setUpdateButtonState({ disabled: true, label: 'Atualizando...' });
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('focus', () => {
      checkForUpdates();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    });

    setUpdateButtonState({ disabled: false, label: 'Atualizar app' });
    hideUpdateMessage();
  } catch (error) {
    console.error('Falha ao registrar service worker:', error);
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallButton();
});

document.addEventListener('click', async (event) => {
  const updateButton = getUpdateButton();
  const installButton = getInstallButton();

  if (updateButton && event.target === updateButton) {
    checkForUpdates({ manual: true });
    return;
  }

  if (!installButton || event.target !== installButton) {
    return;
  }

  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  hideInstallButton();
});

registerServiceWorker();