function getApiBaseUrl() {
  const configuredBaseUrl = window.MAGALU_RUNTIME_CONFIG && window.MAGALU_RUNTIME_CONFIG.apiBaseUrl;

  if (!configuredBaseUrl) {
    return '';
  }

  return configuredBaseUrl.replace(/\/$/, '');
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

function getAppRootUrl() {
  const routeNames = new Set(['login', 'primeiro-acesso', 'perfil', 'logistica', 'teste', 'agenda', 'feed', 'scanner', 'scanner-kit', 'quiz']);
  const currentUrl = new URL(window.location.href);
  const segments = currentUrl.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return `${currentUrl.origin}/`;
  }

  let workingSegments = [...segments];
  const lastSegment = workingSegments[workingSegments.length - 1];

  if (lastSegment.includes('.')) {
    workingSegments = workingSegments.slice(0, -1);
  }

  const lastDirectory = workingSegments[workingSegments.length - 1];

  if (routeNames.has(lastDirectory)) {
    workingSegments = workingSegments.slice(0, -1);
  }

  const basePath = workingSegments.length > 0 ? `/${workingSegments.join('/')}/` : '/';

  return `${currentUrl.origin}${basePath}`;
}

function buildAppUrl(path = '/') {
  const rootUrl = getAppRootUrl();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return new URL(normalizedPath, rootUrl).toString();
}

function readStoredUser() {
  const rawUser = localStorage.getItem('magalu_system_user');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
}

function storeUser(user) {
  localStorage.setItem('magalu_system_user', JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem('magalu_system_user');
}

function requiresFirstAccess(user) {
  return Boolean(user) && user.firstAccessCompleted !== true;
}

function getAuthenticatedHomeUrl(user) {
  return buildAppUrl(requiresFirstAccess(user) ? '/primeiro-acesso/' : '/perfil/');
}

function withApiDefaults(options = {}) {
  const headers = new Headers(options.headers || {});

  headers.set('ngrok-skip-browser-warning', 'true');

  return {
    ...options,
    headers,
  };
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  return {
    error: text,
    rawText: text,
  };
}

window.magaluApi = {
  buildAppUrl,
  buildApiUrl,
  clearStoredUser,
  getAuthenticatedHomeUrl,
  getAppRootUrl,
  parseApiResponse,
  readStoredUser,
  requiresFirstAccess,
  storeUser,
  withApiDefaults,
};