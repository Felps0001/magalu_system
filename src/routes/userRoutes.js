const express = require('express');

const {
  createUserHandler,
  getUserByIdHandler,
  getUserAereoHandler,
  getUserKitStatusHandler,
  getUserQrCodeHandler,
  getUserRotaHandler,
  listAgendaByTurmaHandler,
  listUsersHandler,
  marcarKitHandler,
  upsertUserAereoHandler,
  upsertUserRotaHandler,
  updateUserProfileHandler,
} = require('../controllers/userController');

const router = express.Router();

router.get('/agenda', listAgendaByTurmaHandler);
router.patch('/:userId/profile', updateUserProfileHandler);
router.get('/:userId/rota', getUserRotaHandler);
router.post('/:userId/rota', upsertUserRotaHandler);
router.put('/:userId/rota', upsertUserRotaHandler);
router.get('/:userId/aereo', getUserAereoHandler);
router.post('/:userId/aereo', upsertUserAereoHandler);
router.put('/:userId/aereo', upsertUserAereoHandler);
router.get('/:userId/kit', getUserKitStatusHandler);
router.get('/:userId/qrcode', getUserQrCodeHandler);
router.get('/:userId', getUserByIdHandler);
router.get('/', listUsersHandler);
router.post('/', createUserHandler);
router.post('/:userId/kit', marcarKitHandler);

module.exports = router;