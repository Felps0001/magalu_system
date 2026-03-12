const express = require('express');
const path = require('path');

const router = express.Router();

const publicDirectory = path.join(__dirname, '..', '..', 'public');

router.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

router.get('/primeiro-acesso', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'first-access.html'));
});

router.get('/perfil', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perfil.html'));
});

router.get('/teste', (req, res) => {
  res.redirect('/perfil/');
});

router.get('/agenda', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'agenda.html'));
});

router.get('/feed', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'feed.html'));
});

router.get('/scanner', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'scanner.html'));
});

module.exports = router;