const express = require('express');
const path = require('path');

const routes = require('./routes');
const webRoutes = require('./routes/webRoutes');

function createApp() {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  });
  app.use(express.json());
  app.use(express.static(publicDirectory));
  app.use(webRoutes);
  app.use('/api', routes);

  return app;
}

module.exports = {
  createApp,
};