const express = require('express');

const {
  createQuestionHandler,
  listQuestionsHandler,
  updateQuestionStatusHandler,
} = require('../controllers/questionController');
const {
  listActiveQuestionSessionsHandler,
  startQuestionSessionHandler,
} = require('../controllers/questionSessionController');

const router = express.Router();

router.get('/sessions/active', listActiveQuestionSessionsHandler);
router.post('/sessions/start', startQuestionSessionHandler);
router.get('/', listQuestionsHandler);
router.post('/', createQuestionHandler);
router.patch('/:questionId/status', updateQuestionStatusHandler);

module.exports = router;