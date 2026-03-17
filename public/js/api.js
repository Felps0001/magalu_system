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
  const routeNames = new Set(['login', 'primeiro-acesso', 'perfil', 'linktree', 'logistica', 'perguntas-palestra-1', 'questions-palestra-1', 'perguntas-palestra-2', 'questions-palestra-2', 'perguntas-palestra-3', 'questions-palestra-3', 'moderacao-perguntas', 'questions-moderation', 'question-moderation', 'perguntas-aprovadas', 'questions-approved', 'teste', 'agenda', 'feed', 'estandes', 'scanner', 'scanner-kit', 'quiz']);
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

function buildQrNavigationCandidate(path) {
  if (typeof path !== 'string') {
    return null;
  }

  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    try {
      const parsedUrl = new URL(trimmedPath);

      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        return parsedUrl.toString();
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  if (trimmedPath.startsWith('/') || trimmedPath.startsWith('./') || trimmedPath.startsWith('../')) {
    return buildAppUrl(trimmedPath);
  }

  if (/^[a-z0-9/_-]+$/i.test(trimmedPath)) {
    return buildAppUrl(trimmedPath);
  }

  return null;
}

function resolveQrNavigationUrl(rawValue) {
  const directCandidate = buildQrNavigationCandidate(rawValue);

  if (directCandidate) {
    return directCandidate;
  }

  if (typeof rawValue !== 'string') {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(rawValue);
    const candidateKeys = ['url', 'href', 'path', 'route', 'redirectTo', 'redirectUrl', 'deepLink', 'destination'];

    for (const key of candidateKeys) {
      if (typeof parsedPayload[key] === 'string') {
        const candidateUrl = buildQrNavigationCandidate(parsedPayload[key]);

        if (candidateUrl) {
          return candidateUrl;
        }
      }
    }

    if (parsedPayload && parsedPayload.type === 'magalu-user' && parsedPayload.user) {
      return buildAppUrl('/perfil/');
    }
  } catch (error) {
    return null;
  }

  return null;
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
  resolveQrNavigationUrl,
  requiresFirstAccess,
  storeUser,
  withApiDefaults,
};