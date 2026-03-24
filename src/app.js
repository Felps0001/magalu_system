const express = require('express');
const path = require('path');

const routes = require('./routes');
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
  app.use(express.static(publicDirectory));
  app.use('/api', routes);

  return app;
}

module.exports = {
  createApp,
};