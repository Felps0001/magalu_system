const feedUserName = document.getElementById('feed-user-name');
const feedUserRole = document.getElementById('feed-user-role');
const feedDrawerUserName = document.getElementById('feed-drawer-user-name');
const feedDrawerUserRole = document.getElementById('feed-drawer-user-role');
const feedList = document.getElementById('feed-list');
const feedForm = document.getElementById('feed-form');
const feedMessageInput = document.getElementById('feed-message');
const feedImageFileInput = document.getElementById('feed-image-file');
const feedFormMessage = document.getElementById('feed-form-message');
const feedSubmitButton = document.getElementById('feed-submit-button');
const feedRefreshButton = document.getElementById('feed-refresh-button');
const logoutButton = document.getElementById('logout-button');
const menuButton = document.getElementById('feed-menu-button');
const drawer = document.getElementById('feed-drawer');
const drawerBackdrop = document.getElementById('feed-drawer-backdrop');
const closeDrawerButton = document.getElementById('feed-close-drawer');
const openComposerButton = document.getElementById('feed-open-composer');
const composerModal = document.getElementById('feed-composer-modal');
const closeComposerButton = document.getElementById('feed-close-composer');
const cancelComposerButton = document.getElementById('feed-cancel-button');
const modalBackdrop = document.getElementById('feed-modal-backdrop');
const openKitCodeMenuButton = document.getElementById('feed-open-kit-code-menu');
const kitCodeModal = document.getElementById('feed-kit-code-modal');
const kitCodeBackdrop = document.getElementById('feed-kit-code-backdrop');
const closeKitCodeButton = document.getElementById('feed-close-kit-code');
const closeKitCodeSecondaryButton = document.getElementById('feed-close-kit-code-secondary');
const generateKitCodeButton = document.getElementById('feed-generate-kit-code-button');
const kitCodePreview = document.getElementById('feed-kit-code-preview');
const imageModal = document.getElementById('feed-image-modal');
const imageBackdrop = document.getElementById('feed-image-backdrop');
const closeImageButton = document.getElementById('feed-close-image');
const imagePreview = document.getElementById('feed-image-preview');
const imageCaption = document.getElementById('feed-image-caption');

let currentUser = null;
let kitCodeLoaded = false;
let drawerCloseTimer = null;

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToFirstAccess() {
  window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
}

function setFormMessage(message, type) {
  feedFormMessage.textContent = message;
  feedFormMessage.className = `form-message feed-mobile-message ${type}`;
}

function setDrawerState(isOpen) {
  if (drawerCloseTimer) {
    clearTimeout(drawerCloseTimer);
    drawerCloseTimer = null;
  }

  if (isOpen) {
    drawer.hidden = false;
    drawerBackdrop.hidden = false;
    drawer.classList.remove('feed-drawer--closing');
    void drawer.offsetWidth;
  } else {
    drawer.classList.add('feed-drawer--closing');
    drawerCloseTimer = setTimeout(() => {
      drawer.hidden = true;
      drawerBackdrop.hidden = true;
      drawer.classList.remove('feed-drawer--closing');
      drawerCloseTimer = null;
    }, 280);
  }

  drawer.setAttribute('aria-hidden', String(!isOpen));
  menuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('feed-ui-lock', isOpen || !composerModal.hidden || !kitCodeModal.hidden || !imageModal.hidden);
}

function setComposerState(isOpen) {
  composerModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !kitCodeModal.hidden || !imageModal.hidden);

  if (isOpen) {
    setFormMessage('', '');
    feedMessageInput.focus();
  }
}

function setKitCodeModalState(isOpen) {
  kitCodeModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !composerModal.hidden || !imageModal.hidden);
}

function setImageModalState(isOpen) {
  imageModal.hidden = !isOpen;
  document.body.classList.toggle('feed-ui-lock', isOpen || !drawer.hidden || !composerModal.hidden || !kitCodeModal.hidden);
}

setDrawerState(false);
setComposerState(false);
setKitCodeModalState(false);
setImageModalState(false);

function openImageModal(imageUrl, captionText) {
  imagePreview.src = imageUrl;
  if (imageCaption) {
    imageCaption.textContent = '';
  }
  setImageModalState(true);
}

function closeImageModal() {
  setImageModalState(false);
  imagePreview.removeAttribute('src');
  if (imageCaption) {
    imageCaption.textContent = '';
  }
}

function renderKitCode(responseData) {
  kitCodePreview.innerHTML = responseData.qrCodeSvg;
  kitCodeLoaded = true;
}

function renderKitCodePlaceholder(message) {
  kitCodePreview.innerHTML = `<p class="muted">${message}</p>`;
  kitCodeLoaded = false;
}

function setKitActionVisibility(isVisible) {
  openKitCodeMenuButton.hidden = !isVisible;

  if (!isVisible && !kitCodeModal.hidden) {
    setKitCodeModalState(false);
  }
}

async function syncKitActionVisibility() {
  setKitActionVisibility(window.magaluApi.hasPendingKit(currentUser));

  if (!currentUser || !currentUser._id) {
    return;
  }

  const kitStatus = await window.magaluApi.fetchUserKitStatus(currentUser._id);

  if (!kitStatus) {
    return;
  }

  currentUser = window.magaluApi.mergeUserKitStatus(currentUser, kitStatus);
  window.magaluApi.storeUser(currentUser);
  setKitActionVisibility(window.magaluApi.hasPendingKit(currentUser));
}

function getKitCodeRequestError(data) {
  if (data && typeof data.error === 'string' && !data.error.includes('<!DOCTYPE')) {
    return data.error;
  }

  const rawText = data && typeof data.rawText === 'string' ? data.rawText : '';

  if (rawText.includes('Cannot GET') && rawText.includes('/qrcode')) {
    return 'O backend em uso ainda nao possui a rota do codigo. Reinicie o servidor local ou publique a versao nova do backend.';
  }

  return 'O backend retornou uma resposta invalida ao gerar o codigo.';
}

async function loadUserKitCode(options = {}) {
  const {
    buttonLoadingLabel = 'Gerando...',
    loadingMessage = 'Carregando QR...',
  } = options;

  if (!currentUser || !currentUser._id) {
    renderKitCodePlaceholder('Usuario nao encontrado para gerar o codigo.');
    return;
  }

  generateKitCodeButton.disabled = true;
  generateKitCodeButton.textContent = buttonLoadingLabel;
  renderKitCodePlaceholder(loadingMessage);

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/users/${encodeURIComponent(currentUser._id)}/qrcode`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getKitCodeRequestError(data));
    }

    renderKitCode(data);
    currentUser = {
      ...currentUser,
      qrCodeGeneratedAt: data.qrCodeGeneratedAt,
      qrCodePayload: data.qrCodePayload,
    };
    window.magaluApi.storeUser(currentUser);
  } catch (error) {
    renderKitCodePlaceholder('O codigo nao foi carregado.');
  } finally {
    generateKitCodeButton.disabled = false;
    generateKitCodeButton.textContent = 'Atualizar codigo';
  }
}

async function openKitCodeModal() {
  setDrawerState(false);
  setKitCodeModalState(true);

  if (kitCodeLoaded) {
    return;
  }

  await loadUserKitCode({
    buttonLoadingLabel: 'Carregando...',
    loadingMessage: 'Carregando QR...',
  });
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
  article.className = 'feed-mobile-card';

  const header = document.createElement('div');
  header.className = 'feed-mobile-card-header';

  const author = document.createElement('div');
  author.className = 'feed-mobile-author';

  const authorName = document.createElement('strong');
  authorName.textContent = item.author && item.author.nome ? item.author.nome : 'Usuario';

  const authorMeta = document.createElement('p');
  authorMeta.textContent = item.author && item.author.filial ? item.author.filial : 'Publicacao interna';

  author.appendChild(authorName);
  author.appendChild(authorMeta);

  const timestamp = document.createElement('span');
  timestamp.className = 'feed-mobile-timestamp';
  timestamp.textContent = formatPostDate(item.createdAt);

  header.appendChild(author);
  header.appendChild(timestamp);
  article.appendChild(header);

  if (item.mensagem) {
    const message = document.createElement('p');
    message.className = 'feed-mobile-message-text';
    message.textContent = item.mensagem;
    article.appendChild(message);
  }

  if (item.imagemUrl) {
    const image = document.createElement('img');
    image.className = 'feed-mobile-image';
    image.src = item.imagemUrl;
    image.alt = `Imagem publicada por ${authorName.textContent}`;
    image.loading = 'lazy';
    image.tabIndex = 0;
    image.role = 'button';
    image.setAttribute('aria-label', 'Abrir imagem em destaque');
    image.addEventListener('click', () => {
      openImageModal(item.imagemUrl, `Publicada por ${authorName.textContent}`);
    });
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openImageModal(item.imagemUrl, `Publicada por ${authorName.textContent}`);
      }
    });
    article.appendChild(image);

    const imageLink = document.createElement('a');
    imageLink.className = 'feed-mobile-image-link';
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
    emptyState.className = 'feed-mobile-card feed-mobile-card--empty';

    const emptyText = document.createElement('p');
    emptyText.className = 'feed-mobile-empty';
    emptyText.textContent = 'Nenhuma publicacao ainda. Toque no botao + para criar a primeira postagem.';

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
  let imageUrl = '';

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
  currentUser = user;
  const userName = user.nome || 'Usuario autenticado';
  const userRole = `${user.cargo || 'Sem cargo'} · ${user.filial || 'Sem filial'}`;
  feedUserName.textContent = userName;
  feedUserRole.textContent = userRole;
  feedDrawerUserName.textContent = userName;
  feedDrawerUserRole.textContent = userRole;
  syncKitActionVisibility();
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
    setComposerState(false);
  } catch (error) {
    setFormMessage(error.message, 'error');
  } finally {
    feedSubmitButton.disabled = false;
    feedSubmitButton.textContent = 'Publicar';
  }
});

feedRefreshButton.addEventListener('click', () => {
  setFormMessage('', '');
  setDrawerState(false);
  loadFeed();
});

logoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});

menuButton.addEventListener('click', () => {
  setDrawerState(true);
});

closeDrawerButton.addEventListener('click', () => {
  setDrawerState(false);
});

drawerBackdrop.addEventListener('click', () => {
  setDrawerState(false);
});

openKitCodeMenuButton.addEventListener('click', () => {
  openKitCodeModal();
});

generateKitCodeButton.addEventListener('click', () => {
  loadUserKitCode();
});

kitCodeBackdrop.addEventListener('click', () => {
  setKitCodeModalState(false);
});

closeKitCodeButton.addEventListener('click', () => {
  setKitCodeModalState(false);
});

closeKitCodeSecondaryButton.addEventListener('click', () => {
  setKitCodeModalState(false);
});

imageBackdrop.addEventListener('click', () => {
  closeImageModal();
});

if (closeImageButton) {
  closeImageButton.addEventListener('click', () => {
    closeImageModal();
  });
}

openComposerButton.addEventListener('click', () => {
  setComposerState(true);
});

closeComposerButton.addEventListener('click', () => {
  setComposerState(false);
});

cancelComposerButton.addEventListener('click', () => {
  setComposerState(false);
});

modalBackdrop.addEventListener('click', () => {
  setComposerState(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (!composerModal.hidden) {
    setComposerState(false);
  }

  if (!kitCodeModal.hidden) {
    setKitCodeModalState(false);
  }

  if (!imageModal.hidden) {
    closeImageModal();
  }

  if (!drawer.hidden) {
    setDrawerState(false);
  }
});