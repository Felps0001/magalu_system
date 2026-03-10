const express = require('express');
const path = require('path');

const routes = require('./routes');
const webRoutes = require('./routes/webRoutes');

function createApp() {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.static(publicDirectory));
  app.use(webRoutes);
  app.use('/api', routes);

  return app;
}

module.exports = {
  createApp,
};