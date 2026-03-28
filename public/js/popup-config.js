(function initializePopupConfig() {
  const currentScript = document.currentScript;
  const scriptUrl = currentScript
    ? new URL(currentScript.src, window.location.href)
    : new URL('./js/popup-config.js', window.location.href);
  const appRootUrl = new URL('../', scriptUrl);

  window.MAGALU_POPUP_CONFIG = {
    enabled: true,
    id: 'estandes-pontos-v1',
    imageUrl: new URL('assets/img/popup-pontos.png', appRootUrl).toString(),
    imageAlt: 'Corra! Veja os estandes que faltam e acumule mais pontos',
    imageLinkUrl: new URL('estandes/', appRootUrl).toString(),
    dismissible: true,
    showOnce: false,
    cooldownMinutes: 30,
    showOnPaths: [],
    hideOnPaths: ['estandes', 'scanner', 'ranking'],
  };
})();