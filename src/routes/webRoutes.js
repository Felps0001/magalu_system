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

router.get('/linktree', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'linktree.html'));
});

router.get('/logistica', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'logistica.html'));
});

router.get('/perguntas-palestra-1', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-palestra-1.html'));
});

router.get('/perguntas-palestra-2', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-palestra-2.html'));
});

router.get('/perguntas-palestra-3', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-palestra-3.html'));
});

router.get('/moderacao-perguntas', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-moderation.html'));
});

router.get('/questions-moderation', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-moderation.html'));
});

router.get('/question-moderation', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-moderation.html'));
});

router.get('/perguntas-aprovadas', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-approved.html'));
});

router.get('/questions-approved', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-approved.html'));
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
  res.redirect('/perfil/');
});

module.exports = router;