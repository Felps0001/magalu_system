const express = require('express');
const path = require('path');

const router = express.Router();

const publicDirectory = path.join(__dirname, '..', '..', 'public');

router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'login.html'));
});

router.get('/teste', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'teste.html'));
});

router.get('/agenda', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'agenda.html'));
});

router.get('/feed', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'feed.html'));
});

module.exports = router;