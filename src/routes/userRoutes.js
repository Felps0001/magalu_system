const express = require('express');

const {
  createUserHandler,
  listAgendaByTurmaHandler,
  listUsersHandler,
} = require('../controllers/userController');

const router = express.Router();

router.get('/agenda', listAgendaByTurmaHandler);
router.get('/', listUsersHandler);
router.post('/', createUserHandler);

module.exports = router;