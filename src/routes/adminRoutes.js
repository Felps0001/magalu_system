const express = require('express');
const { cleanupUsersHandler } = require('../controllers/adminController');

const router = express.Router();

// POST /api/admin/cleanup-users?action=deleteAll|unsetLegacy|drop
router.post('/cleanup-users', cleanupUsersHandler);

module.exports = router;
