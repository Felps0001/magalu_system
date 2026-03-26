const express = require('express');
const path = require('path');

const { noStore } = require('../http/cacheControl');

const router = express.Router();

const publicDirectory = path.join(__dirname, '..', '..', 'public');

router.get('/', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

router.get('/login', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

router.get('/primeiro-acesso', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'first-access.html'));
});

router.get('/users-register.html', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/users-register', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/cadastro-users', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/cadastro-usuarios', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/perfil', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perfil.html'));
});

router.get('/linktree', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'linktree.html'));
});

router.get('/logistica', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'logistica.html'));
});

router.get('/boas-praticas', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'boas-praticas.html'));
});

router.get('/boas-praticas.html', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'boas-praticas.html'));
});

for (let palcoNumber = 1; palcoNumber <= 5; palcoNumber += 1) {
  const palcoRoute = `/palco-${palcoNumber}`;
  const perguntasPalcoRoute = `/perguntas-palco-${palcoNumber}`;
  const questionsPalcoRoute = `/questions-palco-${palcoNumber}`;

  router.get(palcoRoute, noStore(), (req, res) => {
    res.sendFile(path.join(publicDirectory, 'questions-stage.html'));
  });

  router.get(perguntasPalcoRoute, noStore(), (req, res) => {
    res.sendFile(path.join(publicDirectory, 'questions-stage.html'));
  });

  router.get(questionsPalcoRoute, noStore(), (req, res) => {
    res.sendFile(path.join(publicDirectory, 'questions-stage.html'));
  });
}

for (let palestraNumber = 1; palestraNumber <= 3; palestraNumber += 1) {
  const palcoRoute = `/palco-${palestraNumber}/`;

  router.get(`/perguntas-palestra-${palestraNumber}`, (req, res) => {
    res.redirect(palcoRoute);
  });

  router.get(`/questions-palestra-${palestraNumber}`, (req, res) => {
    res.redirect(palcoRoute);
  });
}

router.get('/moderacao-perguntas', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-moderation.html'));
});

router.get('/questions-moderation', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-moderation.html'));
});

router.get('/question-moderation', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-moderation.html'));
});

router.get('/perguntas-aprovadas', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-approved.html'));
});

router.get('/questions-approved', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-approved.html'));
});

router.get('/qrcode-presenca-palco', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-qrcode.html'));
});

router.get('/questions-session-qrcode', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-qrcode.html'));
});

router.get('/checkin-presenca-palco', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-checkin.html'));
});

router.get('/questions-session-checkin', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-checkin.html'));
});

router.get('/teste', (req, res) => {
  res.redirect('/perfil/');
});

router.get('/agenda', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'agenda.html'));
});

router.get('/feed', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'feed.html'));
});

router.get('/estandes', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'estandes.html'));
});

router.get('/ranking', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'ranking.html'));
});

router.get('/perguntas-dissertativas-luiza', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perguntas-dissertativas-luiza.html'));
});

router.get('/perguntas-dissertativas-luiza.html', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perguntas-dissertativas-luiza.html'));
});

router.get('/perguntas-dissertativas-fred', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perguntas-dissertativas-fred.html'));
});

router.get('/perguntas-dissertativas-fred.html', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perguntas-dissertativas-fred.html'));
});

router.get('/perguntas-dissertativas-palestra', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perguntas-dissertativas-palestra.html'));
});

router.get('/perguntas-dissertativas-palestra.html', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'perguntas-dissertativas-palestra.html'));
});

router.get('/quiz/nasher', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'quiz', 'nesher.html'));
});

router.get('/quiz/nasher.html', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'quiz', 'nesher.html'));
});

router.get('/scanner', noStore(), (req, res) => {
  res.sendFile(path.join(publicDirectory, 'scanner.html'));
});

module.exports = router;