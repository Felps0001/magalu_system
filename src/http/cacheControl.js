function setNoStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function setEdgeCache(res, options = {}) {
  const maxAge = Number.isFinite(options.maxAgeSeconds) ? Math.max(0, options.maxAgeSeconds) : 0;
  const sMaxAge = Number.isFinite(options.sMaxAgeSeconds) ? Math.max(0, options.sMaxAgeSeconds) : maxAge;
  const staleWhileRevalidate = Number.isFinite(options.staleWhileRevalidateSeconds)
    ? Math.max(0, options.staleWhileRevalidateSeconds)
    : 0;
  const visibility = options.visibility === 'private' ? 'private' : 'public';
  const directives = [
    visibility,
    `max-age=${maxAge}`,
    `s-maxage=${sMaxAge}`,
  ];

  if (staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  res.set('Cache-Control', directives.join(', '));
}

function applyStaticCacheHeaders(res, filePath) {
  const normalizedPath = String(filePath || '').replace(/\\/g, '/').toLowerCase();

  if (normalizedPath.endsWith('.html') || normalizedPath.endsWith('/sw.js') || normalizedPath.endsWith('manifest.webmanifest')) {
    setNoStore(res);
    return;
  }

  if (/\.(css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/i.test(normalizedPath)) {
    setEdgeCache(res, {
      maxAgeSeconds: 300,
      sMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 86400,
    });
    return;
  }

  setNoStore(res);
}

function noStore() {
  return (req, res, next) => {
    setNoStore(res);
    next();
  };
}

function edgeCache(options = {}) {
  return (req, res, next) => {
    setEdgeCache(res, options);
    next();
  };
}

module.exports = {
  applyStaticCacheHeaders,
  edgeCache,
  noStore,
  setEdgeCache,
  setNoStore,
};