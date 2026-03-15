const express = require('express');

const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const estandeRoutes = require('./estandeRoutes');
const checkinRoutes = require('./checkinRoutes');
const authRoutes = require('./authRoutes');
const feedRoutes = require('./feedRoutes');
const questionRoutes = require('./questionRoutes');

const router = express.Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/estandes', estandeRoutes);
router.use('/checkins', checkinRoutes);
router.use('/feed', feedRoutes);
router.use('/questions', questionRoutes);

module.exports = router;