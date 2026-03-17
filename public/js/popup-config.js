(function initializePopupConfig() {
  const currentScript = document.currentScript;
  const scriptUrl = currentScript
    ? new URL(currentScript.src, window.location.href)
    : new URL('./js/popup-config.js', window.location.href);
  const appRootUrl = new URL('../', scriptUrl);

  window.MAGALU_POPUP_CONFIG = {
    enabled: true,
    id: 'evento-demo-v1',
    imageUrl: new URL('assets/img/check.png', appRootUrl).toString(),
    imageAlt: 'Imagem de exemplo do comunicado',
    imageLinkUrl: '',
    dismissible: true,
    showOnce: false,
    showOnPaths: [],
    hideOnPaths: [],
  };
})();