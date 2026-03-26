const express = require('express');

const {
  createQuestionHandler,
  listQuestionsHandler,
  updateQuestionStatusHandler,
} = require('../controllers/questionController');
const {
  createQuestionSessionAttendanceHandler,
  endQuestionSessionHandler,
  getQuestionSessionAttendanceStatusHandler,
  getQuestionSessionQrCodeHandler,
  listActiveQuestionSessionsHandler,
  startQuestionSessionHandler,
} = require('../controllers/questionSessionController');
const {
  createDissertativeAnswerHandler,
  getDissertativeAnswerStatusHandler,
} = require('../controllers/dissertativeAnswerController');
const { noStore } = require('../http/cacheControl');

const router = express.Router();

router.get('/sessions/active', listActiveQuestionSessionsHandler);
router.get('/sessions/attendance', getQuestionSessionAttendanceStatusHandler);
router.get('/sessions/qrcode', getQuestionSessionQrCodeHandler);
router.post('/sessions/end', endQuestionSessionHandler);
router.post('/sessions/attendance', createQuestionSessionAttendanceHandler);
router.post('/sessions/start', startQuestionSessionHandler);
router.get('/dissertative/status', noStore(), getDissertativeAnswerStatusHandler);
router.post('/dissertative', noStore(), createDissertativeAnswerHandler);
router.get('/', listQuestionsHandler);
router.post('/', createQuestionHandler);
router.patch('/:questionId/status', updateQuestionStatusHandler);

module.exports = router;