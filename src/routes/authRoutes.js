const express = require('express');

const { loginHandler } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginHandler);

module.exports = router;