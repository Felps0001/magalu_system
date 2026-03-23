const express = require('express');

const { loginHandler, startFirstAccessHandler } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginHandler);
router.post('/first-access', startFirstAccessHandler);

module.exports = router;