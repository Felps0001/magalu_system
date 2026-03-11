const isLocalRuntimeHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.MAGALU_RUNTIME_CONFIG = window.MAGALU_RUNTIME_CONFIG || {
  // Em localhost, usa o mesmo host/porta da aplicacao para facilitar o desenvolvimento.
  // Fora do ambiente local, aponta para o backend publicado.
  apiBaseUrl: isLocalRuntimeHost ? '' : 'https://magalu-system.onrender.com',
};