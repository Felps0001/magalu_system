const { ObjectId } = require('mongodb');
const QRCode = require('qrcode');

const {
  getQuestionSessionCheckinsCollection,
  getUsersCollection,
} = require('../config/collections');
const { createQuestionSessionCheckin, SESSION_ATTENDANCE_POINTS } = require('../models/questionSessionCheckin');
const { normalizePalestraId } = require('../models/question');
const { buildCacheKey, deleteCacheByPrefix, deleteCacheKeys } = require('../services/cache');
const {
  endActiveSessionForPalestra,
  getActiveSessionAttendanceQrByPalestra,
  getActiveSessionByAttendanceToken,
  getSessionAttendanceStatus,
  listActiveSessions,
  startNewSessionForPalestra,
} = require('../services/questionSessions');

function buildRequestOrigin(req) {
  const forwardedProtoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : typeof forwardedProtoHeader === 'string'
      ? forwardedProtoHeader.split(',')[0].trim()
      : '';
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.get('host');

  return `${protocol}://${host}`;
}

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

async function getQuestionSessionQrCodeHandler(req, res) {
  try {
    const palestraId = normalizePalestraId(req.query.palestraId);

    if (!palestraId) {
      res.status(400).json({ error: 'O palco informado para carregar o QR e invalido.' });
      return;
    }

    const session = await getActiveSessionAttendanceQrByPalestra(palestraId);

    if (!session) {
      res.status(404).json({ error: 'Nao existe sessao ativa para este palco.' });
      return;
    }

    const attendanceUrl = new URL(session.attendancePath, `${buildRequestOrigin(req)}/`).toString();

    const qrCodeSvg = await QRCode.toString(attendanceUrl, {
      type: 'svg',
      width: 320,
      margin: 1,
      color: {
        dark: '#0d2142',
        light: '#ffffff',
      },
    });

    res.json({
      ...session,
      attendanceUrl,
      qrCodeSvg,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getQuestionSessionAttendanceStatusHandler(req, res) {
  try {
    const attendanceToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    const userId = typeof req.query.userId === 'string' && ObjectId.isValid(req.query.userId)
      ? new ObjectId(req.query.userId)
      : null;

    if (!attendanceToken) {
      res.status(400).json({ error: 'O token do check-in de presenca e obrigatorio.' });
      return;
    }

    const attendanceStatus = await getSessionAttendanceStatus(attendanceToken, userId);

    if (!attendanceStatus) {
      res.status(404).json({ error: 'Este QR de presenca nao esta mais disponivel.' });
      return;
    }

    res.json(attendanceStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createQuestionSessionAttendanceHandler(req, res) {
  try {
    const attendanceToken = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : '';

    if (!attendanceToken) {
      res.status(400).json({ error: 'O token do check-in de presenca e obrigatorio.' });
      return;
    }

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'O usuario informado para o check-in de presenca e invalido.' });
      return;
    }

    const session = await getActiveSessionByAttendanceToken(attendanceToken);

    if (!session) {
      res.status(404).json({ error: 'Este QR de presenca nao esta mais disponivel.' });
      return;
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { id_magalu: 1 } }
    );

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado para registrar a presenca.' });
      return;
    }

    const questionSessionCheckinsCollection = await getQuestionSessionCheckinsCollection();
    const existingCheckin = await questionSessionCheckinsCollection.findOne({
      userId: new ObjectId(userId),
      sessionId: session._id,
    });

    if (existingCheckin) {
      res.status(409).json({
        error: 'A presenca desta sessao ja foi registrada para este usuario.',
        code: 'SESSION_ATTENDANCE_ALREADY_EXISTS',
        alreadyCheckedIn: true,
      });
      return;
    }

    const attendanceCheckin = createQuestionSessionCheckin({
      userId,
      sessionId: session._id,
      palestraId: session.palestraId,
      pontos: SESSION_ATTENDANCE_POINTS,
    });
    const insertResult = await questionSessionCheckinsCollection.insertOne(attendanceCheckin);

    await deleteCacheKeys([
      buildCacheKey(['auth', 'login', user.id_magalu]),
    ]);
    await deleteCacheByPrefix('users:');

    res.status(201).json({
      _id: String(insertResult.insertedId),
      alreadyCheckedIn: false,
      pontos: attendanceCheckin.pontos,
      palestraId: attendanceCheckin.palestraId,
      palestraLabel: attendanceCheckin.palestraLabel,
      sessionId: String(attendanceCheckin.sessionId),
      sessionLabel: session.label,
      checkinEm: attendanceCheckin.checkinEm,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        error: 'A presenca desta sessao ja foi registrada para este usuario.',
        code: 'SESSION_ATTENDANCE_ALREADY_EXISTS',
        alreadyCheckedIn: true,
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createQuestionSessionAttendanceHandler,
  endQuestionSessionHandler,
  getQuestionSessionAttendanceStatusHandler,
  getQuestionSessionQrCodeHandler,
  listActiveQuestionSessionsHandler,
  startQuestionSessionHandler,
};