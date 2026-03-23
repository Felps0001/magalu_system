const { normalizePalestraId } = require('../models/question');
const {
  endActiveSessionForPalestra,
  listActiveSessions,
  startNewSessionForPalestra,
} = require('../services/questionSessions');

async function listActiveQuestionSessionsHandler(req, res) {
  try {
    const palestraId = Object.prototype.hasOwnProperty.call(req.query, 'palestraId')
      ? normalizePalestraId(req.query.palestraId)
      : null;

    if (Object.prototype.hasOwnProperty.call(req.query, 'palestraId') && !palestraId) {
      res.status(400).json({ error: 'O palco informado para consultar a sessao ativa e invalido.' });
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
      res.status(400).json({ error: 'O palco informado para abrir nova sessao e invalido.' });
      return;
    }

    const session = await startNewSessionForPalestra(palestraId);
    res.status(201).json(session);
  } catch (error) {
    res.status(error.message.includes('Ja existe uma sessao ativa') ? 409 : 500).json({ error: error.message });
  }
}

async function endQuestionSessionHandler(req, res) {
  try {
    const palestraId = normalizePalestraId(req.body.palestraId);

    if (!palestraId) {
      res.status(400).json({ error: 'O palco informado para encerrar a sessao e invalido.' });
      return;
    }

    const session = await endActiveSessionForPalestra(palestraId);
    res.json(session);
  } catch (error) {
    res.status(error.message.includes('Nao existe sessao ativa') ? 409 : 500).json({ error: error.message });
  }
}

module.exports = {
  endQuestionSessionHandler,
  listActiveQuestionSessionsHandler,
  startQuestionSessionHandler,
};