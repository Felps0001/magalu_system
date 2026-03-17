(function initializeGlobalPopup() {
  const config = window.MAGALU_POPUP_CONFIG;

  if (!config || config.enabled !== true) {
    return;
  }

  if (!document.body || document.querySelector('[data-global-popup-root]')) {
    return;
  }

  const popupId = typeof config.id === 'string' && config.id.trim() ? config.id.trim() : 'default';
  const storageKey = typeof config.storageKey === 'string' && config.storageKey.trim()
    ? config.storageKey.trim()
    : `magalu-popup:${popupId}`;

  if (!shouldDisplayForCurrentPage(config) || wasDismissed(storageKey, config.showOnce === true)) {
    return;
  }

  const root = document.createElement('div');
  root.className = 'global-event-popup';
  root.setAttribute('data-global-popup-root', 'true');

  const backdrop = document.createElement('button');
  backdrop.className = 'global-event-popup-backdrop';
  backdrop.type = 'button';
  backdrop.setAttribute('aria-label', 'Fechar comunicado');

  const dialog = document.createElement('section');
  dialog.className = 'global-event-popup-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', typeof config.imageAlt === 'string' && config.imageAlt.trim() ? config.imageAlt.trim() : 'Comunicado visual');

  const closeButton = document.createElement('button');
  closeButton.className = 'global-event-popup-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Fechar comunicado');
  closeButton.textContent = '×';

  if (typeof config.imageUrl === 'string' && config.imageUrl.trim()) {
    const media = config.imageLinkUrl ? document.createElement('a') : document.createElement('div');
    media.className = 'global-event-popup-media';

    if (config.imageLinkUrl) {
      media.href = config.imageLinkUrl;
      media.setAttribute('aria-label', typeof config.imageAlt === 'string' && config.imageAlt.trim() ? config.imageAlt.trim() : 'Abrir comunicado');
      media.addEventListener('click', () => {
        markDismissed(storageKey, config.showOnce === true);
      });
    }

    const image = document.createElement('img');
    image.className = 'global-event-popup-image';
    image.src = config.imageUrl;
    image.alt = typeof config.imageAlt === 'string' ? config.imageAlt : '';
    media.appendChild(image);
    dialog.appendChild(media);
  }

  dialog.appendChild(closeButton);
  root.appendChild(backdrop);
  root.appendChild(dialog);
  document.body.appendChild(root);
  document.body.classList.add('global-event-popup-open');

  const dismissible = config.dismissible !== false;
  const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (dismissible) {
    backdrop.addEventListener('click', closePopup);
    closeButton.addEventListener('click', closePopup);
  } else {
    backdrop.disabled = true;
    closeButton.hidden = true;
  }

  document.addEventListener('keydown', handleKeydown);
  closeButton.focus();

  function closePopup() {
    markDismissed(storageKey, config.showOnce === true);
    document.removeEventListener('keydown', handleKeydown);
    document.body.classList.remove('global-event-popup-open');
    root.remove();

    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && dismissible) {
      closePopup();
    }
  }

  function shouldDisplayForCurrentPage(popupConfig) {
    const currentPath = window.location.pathname.toLowerCase();
    const showOnPaths = Array.isArray(popupConfig.showOnPaths) ? popupConfig.showOnPaths : [];
    const hideOnPaths = Array.isArray(popupConfig.hideOnPaths) ? popupConfig.hideOnPaths : [];

    if (showOnPaths.length > 0 && !showOnPaths.some((item) => currentPath.includes(String(item).toLowerCase()))) {
      return false;
    }

    if (hideOnPaths.some((item) => currentPath.includes(String(item).toLowerCase()))) {
      return false;
    }

    if (popupConfig.startsAt && Number.isNaN(Date.parse(popupConfig.startsAt)) === false) {
      if (Date.now() < Date.parse(popupConfig.startsAt)) {
        return false;
      }
    }

    if (popupConfig.endsAt && Number.isNaN(Date.parse(popupConfig.endsAt)) === false) {
      if (Date.now() > Date.parse(popupConfig.endsAt)) {
        return false;
      }
    }

    return true;
  }

  function wasDismissed(key, showOnce) {
    if (!showOnce) {
      return false;
    }

    try {
      return window.localStorage.getItem(key) === 'dismissed';
    } catch (error) {
      return false;
    }
  }

  function markDismissed(key, showOnce) {
    if (!showOnce) {
      return;
    }

    try {
      window.localStorage.setItem(key, 'dismissed');
    } catch (error) {
      // Ignora indisponibilidade do storage para nao bloquear o popup.
    }
  }
})();