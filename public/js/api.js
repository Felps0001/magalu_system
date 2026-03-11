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
  buildApiUrl,
  parseApiResponse,
  withApiDefaults,
};