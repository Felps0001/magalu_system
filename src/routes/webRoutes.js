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

router.get('/users-register.html', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/users-register', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/cadastro-users', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
});

router.get('/cadastro-usuarios', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'users-register.html'));
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

router.get('/boas-praticas', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'boas-praticas.html'));
});

router.get('/boas-praticas.html', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'boas-praticas.html'));
});

for (let palcoNumber = 1; palcoNumber <= 5; palcoNumber += 1) {
  const palcoRoute = `/palco-${palcoNumber}`;
  const perguntasPalcoRoute = `/perguntas-palco-${palcoNumber}`;
  const questionsPalcoRoute = `/questions-palco-${palcoNumber}`;

  router.get(palcoRoute, (req, res) => {
    res.sendFile(path.join(publicDirectory, 'questions-stage.html'));
  });

  router.get(perguntasPalcoRoute, (req, res) => {
    res.sendFile(path.join(publicDirectory, 'questions-stage.html'));
  });

  router.get(questionsPalcoRoute, (req, res) => {
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

router.get('/qrcode-presenca-palco', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-qrcode.html'));
});

router.get('/questions-session-qrcode', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-qrcode.html'));
});

router.get('/checkin-presenca-palco', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-checkin.html'));
});

router.get('/questions-session-checkin', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'questions-session-checkin.html'));
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

router.get('/estandes', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'estandes.html'));
});

router.get('/ranking', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'ranking.html'));
});

router.get('/scanner', (req, res) => {
  res.redirect('/perfil/');
});

module.exports = router;