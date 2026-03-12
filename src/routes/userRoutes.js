const express = require('express');

const {
  createUserHandler,
  getUserKitStatusHandler,
  getUserQrCodeHandler,
  listAgendaByTurmaHandler,
  listUsersHandler,
  marcarKitHandler,
  updateUserProfileHandler,
} = require('../controllers/userController');

const router = express.Router();

router.get('/agenda', listAgendaByTurmaHandler);
router.patch('/:userId/profile', updateUserProfileHandler);
router.get('/:userId/kit', getUserKitStatusHandler);
router.get('/:userId/qrcode', getUserQrCodeHandler);
router.get('/', listUsersHandler);
router.post('/', createUserHandler);
router.post('/:userId/kit', marcarKitHandler);

module.exports = router;