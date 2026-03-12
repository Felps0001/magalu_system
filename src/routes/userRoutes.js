const express = require('express');

const {
  createUserHandler,
  getUserQrCodeHandler,
  listAgendaByTurmaHandler,
  listUsersHandler,
} = require('../controllers/userController');

const router = express.Router();


const { marcarKitHandler } = require('../controllers/userController');

router.get('/agenda', listAgendaByTurmaHandler);
router.get('/:userId/qrcode', getUserQrCodeHandler);
router.get('/', listUsersHandler);
router.post('/', createUserHandler);
router.post('/:userId/kit', marcarKitHandler);

module.exports = router;