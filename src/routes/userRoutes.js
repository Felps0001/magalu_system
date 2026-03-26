const express = require('express');

const { edgeCache, noStore } = require('../http/cacheControl');

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

router.get('/agenda', noStore(), listAgendaByTurmaHandler);
router.patch('/:userId/profile', updateUserProfileHandler);
router.get('/:userId/rota', noStore(), getUserRotaHandler);
router.post('/:userId/rota', upsertUserRotaHandler);
router.put('/:userId/rota', upsertUserRotaHandler);
router.get('/:userId/aereo', noStore(), getUserAereoHandler);
router.post('/:userId/aereo', upsertUserAereoHandler);
router.put('/:userId/aereo', upsertUserAereoHandler);
router.get('/:userId/kit', noStore(), getUserKitStatusHandler);
router.get('/:userId/qrcode', noStore(), getUserQrCodeHandler);
router.get('/:userId', noStore(), getUserByIdHandler);
router.get('/', (req, res, next) => {
  const requestedView = typeof req.query.view === 'string' ? req.query.view.trim().toLowerCase() : '';

  if (requestedView === 'ranking') {
    return edgeCache({
      maxAgeSeconds: 15,
      sMaxAgeSeconds: 30,
      staleWhileRevalidateSeconds: 60,
    })(req, res, next);
  }

  return noStore()(req, res, next);
}, listUsersHandler);
router.post('/', createUserHandler);
router.post('/:userId/kit', marcarKitHandler);

module.exports = router;