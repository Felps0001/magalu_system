const express = require('express');

const { edgeCache } = require('../http/cacheControl');

const {
  createEstandeHandler,
  listEstandesHandler,
} = require('../controllers/estandeController');

const router = express.Router();

router.get('/', edgeCache({ maxAgeSeconds: 15, sMaxAgeSeconds: 45, staleWhileRevalidateSeconds: 120 }), listEstandesHandler);
router.post('/', createEstandeHandler);

module.exports = router;