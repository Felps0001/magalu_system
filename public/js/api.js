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
  const routeNames = new Set(['login', 'primeiro-acesso', 'cadastro-users', 'cadastro-usuarios', 'perfil', 'linktree', 'logistica', 'boas-praticas', 'perguntas-palestra-1', 'questions-palestra-1', 'perguntas-palestra-2', 'questions-palestra-2', 'perguntas-palestra-3', 'questions-palestra-3', 'perguntas-palco-1', 'questions-palco-1', 'palco-1', 'perguntas-palco-2', 'questions-palco-2', 'palco-2', 'perguntas-palco-3', 'questions-palco-3', 'palco-3', 'perguntas-palco-4', 'questions-palco-4', 'palco-4', 'perguntas-palco-5', 'questions-palco-5', 'palco-5', 'moderacao-perguntas', 'questions-moderation', 'question-moderation', 'perguntas-aprovadas', 'questions-approved', 'qrcode-presenca-palco', 'questions-session-qrcode', 'checkin-presenca-palco', 'questions-session-checkin', 'perguntas-dissertativas-luiza', 'perguntas-dissertativas-fred', 'perguntas-dissertativas-palestra', 'teste', 'agenda', 'feed', 'estandes', 'ranking', 'scanner', 'scanner-kit', 'quiz']);
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

function normalizeStoredUser(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const { regiao, loja, ...normalizedUser } = user;

  return {
    ...normalizedUser,
    regional: typeof user.regional === 'string' && user.regional.trim()
      ? user.regional.trim()
      : typeof user.regiao === 'string'
        ? user.regiao.trim()
        : '',
    filial: typeof user.filial === 'string' && user.filial.trim()
      ? user.filial.trim()
      : typeof user.loja === 'string'
        ? user.loja.trim()
        : '',
    kit: Boolean(user.kit),
    kitExtra: Boolean(user.kitExtra),
    kitExtraRetirada: Boolean(user.kitExtraRetirada),
  };
}

function normalizeIdMagaluValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function canAccessRanking(userOrIdMagalu) {
  const idMagalu = typeof userOrIdMagalu === 'string'
    ? userOrIdMagalu
    : userOrIdMagalu && typeof userOrIdMagalu.id_magalu === 'string'
      ? userOrIdMagalu.id_magalu
      : '';

  const normalizedIdMagalu = normalizeIdMagaluValue(idMagalu);

  return normalizedIdMagalu === 'admin' || normalizedIdMagalu === '0002';
}

function mergeUserKitStatus(user, kitStatus) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  if (!kitStatus || typeof kitStatus !== 'object') {
    return normalizeStoredUser(user);
  }

  return normalizeStoredUser({
    ...user,
    kit: Boolean(kitStatus.kit),
    kitExtra: Boolean(kitStatus.kitExtra),
    kitExtraRetirada: Boolean(kitStatus.kitExtraRetirada),
  });
}

function hasPendingKit(user) {
  return Boolean(user) && user.kit !== true;
}

function readStoredUser() {
  const rawUser = localStorage.getItem('magalu_system_user');

  if (!rawUser) {
    return null;
  }

  try {
    return normalizeStoredUser(JSON.parse(rawUser));
  } catch (error) {
    return null;
  }
}

function storeUser(user) {
  localStorage.setItem('magalu_system_user', JSON.stringify(normalizeStoredUser(user)));
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

async function fetchUserKitStatus(userId) {
  if (!userId) {
    return null;
  }

  try {
    const response = await fetch(
      buildApiUrl(`/api/users/${encodeURIComponent(userId)}/kit`),
      withApiDefaults({ method: 'GET' })
    );
    const data = await parseApiResponse(response);

    if (!response.ok || !data || typeof data !== 'object') {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

async function fetchUserRota(userId) {
  if (!userId) {
    return null;
  }

  try {
    const response = await fetch(
      buildApiUrl(`/api/users/${encodeURIComponent(userId)}/rota`),
      withApiDefaults({ method: 'GET' })
    );
    const data = await parseApiResponse(response);

    if (!response.ok || !data || typeof data !== 'object') {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

async function fetchUserAereo(userId) {
  if (!userId) {
    return null;
  }

  try {
    const response = await fetch(
      buildApiUrl(`/api/users/${encodeURIComponent(userId)}/aereo`),
      withApiDefaults({ method: 'GET' })
    );
    const data = await parseApiResponse(response);

    if (!response.ok || !data || typeof data !== 'object') {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

async function fetchUserById(userId) {
  if (!userId) {
    return null;
  }

  try {
    const response = await fetch(
      buildApiUrl(`/api/users/${encodeURIComponent(userId)}`),
      withApiDefaults({ method: 'GET' })
    );
    const data = await parseApiResponse(response);

    if (!response.ok || !data || typeof data !== 'object') {
      return null;
    }

    return normalizeStoredUser(data);
  } catch (error) {
    return null;
  }
}

window.magaluApi = {
  buildAppUrl,
  buildApiUrl,
  canAccessRanking,
  clearStoredUser,
  fetchUserAereo,
  fetchUserById,
  fetchUserKitStatus,
  fetchUserRota,
  getAuthenticatedHomeUrl,
  getAppRootUrl,
  hasPendingKit,
  mergeUserKitStatus,
  parseApiResponse,
  readStoredUser,
  resolveQrNavigationUrl,
  requiresFirstAccess,
  storeUser,
  withApiDefaults,
};