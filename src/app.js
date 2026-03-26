const express = require('express');
const path = require('path');

const routes = require('./routes');
const { applyStaticCacheHeaders } = require('./http/cacheControl');
const webRoutes = require('./routes/webRoutes');

function createApp(options = {}) {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');
  const preRouteMiddlewares = Array.isArray(options.preRouteMiddlewares)
    ? options.preRouteMiddlewares.filter(Boolean)
    : [];

  app.disable('x-powered-by');
  preRouteMiddlewares.forEach((middleware) => {
    app.use(middleware);
  });
  app.use(express.json());
  app.use(webRoutes);
  app.use(express.static(publicDirectory, {
    setHeaders: applyStaticCacheHeaders,
  }));
  app.use('/api', routes);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Rota da API nao encontrada.' });
  });

  return app;
}

module.exports = {
  createApp,
};