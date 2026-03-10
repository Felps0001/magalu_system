const express = require('express');

const {
  createCheckinHandler,
  listCheckinsHandler,
} = require('../controllers/checkinController');

const router = express.Router();

router.get('/', listCheckinsHandler);
router.post('/', createCheckinHandler);

module.exports = router;