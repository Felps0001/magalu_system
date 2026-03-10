const express = require('express');

const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const estandeRoutes = require('./estandeRoutes');
const checkinRoutes = require('./checkinRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/estandes', estandeRoutes);
router.use('/checkins', checkinRoutes);

module.exports = router;