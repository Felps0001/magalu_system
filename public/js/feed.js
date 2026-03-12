const feedUserName = document.getElementById('feed-user-name');
const feedUserRole = document.getElementById('feed-user-role');
const feedList = document.getElementById('feed-list');
const feedForm = document.getElementById('feed-form');
const feedMessageInput = document.getElementById('feed-message');
const feedImageFileInput = document.getElementById('feed-image-file');
const feedImageUrlInput = document.getElementById('feed-image-url');
const feedFormMessage = document.getElementById('feed-form-message');
const feedSubmitButton = document.getElementById('feed-submit-button');
const feedRefreshButton = document.getElementById('feed-refresh-button');
const logoutButton = document.getElementById('logout-button');

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToFirstAccess() {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setFormMessage(message, type) {
  feedFormMessage.textContent = message;
  feedFormMessage.className = `form-message ${type}`;
}

function normalizeApiError(data, fallbackMessage) {
  if (data && typeof data.error === 'string' && data.error.trim()) {
    const trimmedError = data.error.trim();

    if (trimmedError.startsWith('<!DOCTYPE') || trimmedError.startsWith('<html')) {
      return 'A API do feed respondeu HTML em vez de JSON. Se voce estiver localmente, reinicie o servidor Node e abra a aplicacao em localhost:3000. Se estiver usando o Render, publique a versao nova do backend.';
    }

    return trimmedError;
  }

  return fallbackMessage;
}

function formatPostDate(value) {
  if (!value) {
    return 'Agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function createFeedCard(item) {
  const article = document.createElement('article');
  article.className = 'detail-card feed-card';

  const header = document.createElement('div');
  header.className = 'feed-card-header';

  const author = document.createElement('div');
  author.className = 'feed-author';

  const authorName = document.createElement('strong');
  authorName.textContent = item.author && item.author.nome ? item.author.nome : 'Usuario';

  const authorMeta = document.createElement('p');
  authorMeta.textContent = item.author && item.author.loja ? item.author.loja : 'Publicacao interna';

  author.appendChild(authorName);
  author.appendChild(authorMeta);

  const timestamp = document.createElement('span');
  timestamp.className = 'feed-timestamp';
  timestamp.textContent = formatPostDate(item.createdAt);

  header.appendChild(author);
  header.appendChild(timestamp);
  article.appendChild(header);

  if (item.mensagem) {
    const message = document.createElement('p');
    message.className = 'feed-message';
    message.textContent = item.mensagem;
    article.appendChild(message);
  }

  if (item.imagemUrl) {
    const image = document.createElement('img');
    image.className = 'feed-image';
    image.src = item.imagemUrl;
    image.alt = `Imagem publicada por ${authorName.textContent}`;
    image.loading = 'lazy';
    article.appendChild(image);

    const imageLink = document.createElement('a');
    imageLink.className = 'feed-image-link';
    imageLink.href = item.imagemUrl;
    imageLink.target = '_blank';
    imageLink.rel = 'noreferrer';
    imageLink.textContent = 'Abrir imagem original';
    article.appendChild(imageLink);
  }

  return article;
}

function renderFeed(items) {
  feedList.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    const emptyState = document.createElement('article');
    emptyState.className = 'detail-card feed-card';

    const emptyText = document.createElement('p');
    emptyText.className = 'feed-empty';
    emptyText.textContent = 'Nenhuma publicacao ainda. Use o formulario ao lado para criar a primeira postagem.';

    emptyState.appendChild(emptyText);
    feedList.appendChild(emptyState);
    return;
  }

  items.forEach((item) => {
    feedList.appendChild(createFeedCard(item));
  });
}

async function loadFeed() {
  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/feed'),
      window.magaluApi.withApiDefaults()
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(normalizeApiError(data, 'Nao foi possivel carregar o feed.'));
    }

    renderFeed(data);
  } catch (error) {
    renderFeed([]);
    setFormMessage(error.message, 'error');
  }
}

async function requestUploadUrl(user, file) {
  const response = await fetch(
    window.magaluApi.buildApiUrl('/api/feed/upload-url'),
    window.magaluApi.withApiDefaults({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorId: user._id || '',
        authorIdMagalu: user.id_magalu || '',
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    })
  );

  const data = await window.magaluApi.parseApiResponse(response);

  if (!response.ok) {
    throw new Error(normalizeApiError(data, 'Nao foi possivel preparar o upload da imagem.'));
  }

  return data;
}

async function uploadFileToCloudflare(file, uploadConfig) {
  const response = await fetch(uploadConfig.uploadUrl, {
    method: uploadConfig.method || 'PUT',
    headers: uploadConfig.headers || {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel enviar a imagem para o Cloudflare R2. Verifique a politica de CORS do bucket e tente novamente.');
  }

  return uploadConfig.imageUrl;
}

async function createPost(user) {
  let imageUrl = feedImageUrlInput.value.trim();

  if (feedImageFileInput.files && feedImageFileInput.files[0]) {
    setFormMessage('Enviando imagem para o Cloudflare...', 'info');
    const uploadConfig = await requestUploadUrl(user, feedImageFileInput.files[0]);
    imageUrl = await uploadFileToCloudflare(feedImageFileInput.files[0], uploadConfig);
  }

  const response = await fetch(
    window.magaluApi.buildApiUrl('/api/feed'),
    window.magaluApi.withApiDefaults({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorId: user._id || '',
        authorIdMagalu: user.id_magalu || '',
        mensagem: feedMessageInput.value,
        imagemUrl: imageUrl,
      }),
    })
  );

  const data = await window.magaluApi.parseApiResponse(response);

  if (!response.ok) {
    throw new Error(normalizeApiError(data, 'Nao foi possivel publicar no feed.'));
  }

  return data;
}

const user = window.magaluApi.readStoredUser();

if (!user) {
  redirectToLogin();
} else if (window.magaluApi.requiresFirstAccess(user)) {
  redirectToFirstAccess();
} else {
  feedUserName.textContent = user.nome || 'Usuario autenticado';
  feedUserRole.textContent = `${user.cargo || 'Sem cargo'} · ${user.loja || 'Sem loja'} · ${user.turma || 'Sem turma'}`;
  loadFeed();
}

feedForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!user) {
    redirectToLogin();
    return;
  }

  feedSubmitButton.disabled = true;
  feedSubmitButton.textContent = 'Publicando...';
  setFormMessage('', '');

  try {
    await createPost(user);
    feedForm.reset();
    setFormMessage('Publicacao criada com sucesso.', 'success');
    await loadFeed();
  } catch (error) {
    setFormMessage(error.message, 'error');
  } finally {
    feedSubmitButton.disabled = false;
    feedSubmitButton.textContent = 'Publicar';
  }
});

feedRefreshButton.addEventListener('click', () => {
  setFormMessage('', '');
  loadFeed();
});

logoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});