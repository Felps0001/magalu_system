const express = require('express');

const {
  createEstandeHandler,
  listEstandesHandler,
} = require('../controllers/estandeController');

const router = express.Router();

router.get('/', listEstandesHandler);
router.post('/', createEstandeHandler);

module.exports = router;