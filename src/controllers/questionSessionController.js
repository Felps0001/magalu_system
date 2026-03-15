const { normalizePalestraId } = require('../models/question');
const {
  listActiveSessions,
  startNewSessionForPalestra,
} = require('../services/questionSessions');

async function listActiveQuestionSessionsHandler(req, res) {
  try {
    const palestraId = Object.prototype.hasOwnProperty.call(req.query, 'palestraId')
      ? normalizePalestraId(req.query.palestraId)
      : null;

    if (Object.prototype.hasOwnProperty.call(req.query, 'palestraId') && !palestraId) {
      res.status(400).json({ error: 'A palestra informada para consultar a sessao ativa e invalida.' });
      return;
    }

    const sessions = await listActiveSessions({ palestraId });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function startQuestionSessionHandler(req, res) {
  try {
    const palestraId = normalizePalestraId(req.body.palestraId);

    if (!palestraId) {
      res.status(400).json({ error: 'A palestra informada para abrir nova sessao e invalida.' });
      return;
    }

    const session = await startNewSessionForPalestra(palestraId);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listActiveQuestionSessionsHandler,
  startQuestionSessionHandler,
};