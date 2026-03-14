require('dotenv').config();
const { createApp } = require('../src/app');
const { Buffer } = require('buffer');

(async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const usersResponse = await fetch(`${base}/api/users`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    const users = await usersResponse.json();

    if (!usersResponse.ok) {
      throw new Error(`GET /api/users falhou: ${JSON.stringify(users)}`);
    }

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Nenhum usuario encontrado para testar o feed.');
    }

    const first = users[0];

    const getFeedResponse = await fetch(`${base}/api/feed`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    const getFeedBody = await getFeedResponse.text();

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sXnK0cAAAAASUVORK5CYII=',
      'base64'
    );

    const form = new FormData();
    form.append('authorId', String(first._id || ''));
    form.append('authorIdMagalu', String(first.id_magalu || ''));
    form.append('mensagem', 'Teste automatico do upload R2');
    form.append('imagem', new Blob([png], { type: 'image/png' }), 'teste-r2.png');

    const postFeedResponse = await fetch(`${base}/api/feed`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      body: form,
    });
    const postFeedBody = await postFeedResponse.text();

    console.log(JSON.stringify({
      usersStatus: usersResponse.status,
      firstUser: {
        id_magalu: first.id_magalu,
        nome: first.nome,
        turma: first.turma,
      },
      getFeedStatus: getFeedResponse.status,
      getFeedBody,
      postFeedStatus: postFeedResponse.status,
      postFeedBody,
    }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})();