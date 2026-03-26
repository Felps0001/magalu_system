const express = require('express');

const { getHealth } = require('../controllers/healthController');
const { noStore } = require('../http/cacheControl');

const router = express.Router();

router.get('/health', noStore(), getHealth);

module.exports = router;